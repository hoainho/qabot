import path from "node:path";
import { listDirs, fileExists, safeReadFile } from "../utils/file-utils.js";

export async function detectFeatures(projectDir, projectProfile) {
  const result = {
    pages: [],
    features: [],
    components: {
      shared: { count: 0, path: null },
      page: { count: 0, path: null },
    },
    routes: [],
  };

  const detectors = {
    "react-spa": detectReactSpa,
    nextjs: detectNextjs,
    vue: detectVue,
    angular: detectAngular,
    dotnet: detectDotnet,
  };

  const detect = detectors[projectProfile.type] || detectGeneric;
  const detected = await detect(projectDir, projectProfile);
  return { ...result, ...detected };
}

async function detectReactSpa(dir) {
  const result = {
    pages: [],
    features: [],
    components: {
      shared: { count: 0, path: null },
      page: { count: 0, path: null },
    },
    routes: [],
  };
  const srcDir = path.join(dir, "src");

  const containerCandidates = [
    "src/view/containers",
    "src/pages",
    "src/views",
    "src/containers",
    "src/screens",
  ];
  for (const candidate of containerCandidates) {
    const fullPath = path.join(dir, candidate);
    const dirs = await listDirs(fullPath);
    if (dirs.length > 0) {
      result.pages = dirs.map((d) => ({
        name: d,
        path: path.join(candidate, d),
        route: guessRouteFromPageName(d),
      }));
      result.components.page = { count: dirs.length, path: candidate };
      break;
    }
  }

  const featureCandidates = [
    "src/view/shared/features",
    "src/features",
    "src/modules",
  ];
  for (const candidate of featureCandidates) {
    const fullPath = path.join(dir, candidate);
    const dirs = await listDirs(fullPath);
    if (dirs.length > 0) {
      result.features = dirs.map((d) => ({
        name: d,
        path: path.join(candidate, d),
        type: "feature-module",
      }));
      break;
    }
  }

  const sharedCandidates = [
    "src/view/shared/components",
    "src/components",
    "src/shared/components",
    "src/ui",
  ];
  for (const candidate of sharedCandidates) {
    const dirs = await listDirs(path.join(dir, candidate));
    if (dirs.length > 0) {
      result.components.shared = { count: dirs.length, path: candidate };
      break;
    }
  }

  const routeFile = await findRouteFile(dir);
  if (routeFile) {
    result.routes = await parseSimpleRoutes(routeFile);
  }

  return result;
}

async function detectNextjs(dir) {
  const result = {
    pages: [],
    features: [],
    components: {
      shared: { count: 0, path: null },
      page: { count: 0, path: null },
    },
    routes: [],
  };

  const appDir = (await fileExists(path.join(dir, "app")))
    ? "app"
    : (await fileExists(path.join(dir, "src", "app")))
      ? "src/app"
      : null;
  const pagesDir = (await fileExists(path.join(dir, "pages")))
    ? "pages"
    : (await fileExists(path.join(dir, "src", "pages")))
      ? "src/pages"
      : null;

  const routeDir = appDir || pagesDir;
  if (routeDir) {
    const dirs = await listDirs(path.join(dir, routeDir));
    const filtered = dirs.filter(
      (d) => !d.startsWith("_") && !d.startsWith(".") && d !== "api",
    );
    result.pages = filtered.map((d) => ({
      name: d,
      path: path.join(routeDir, d),
      route: `/${d}`,
    }));
    result.components.page = { count: filtered.length, path: routeDir };
  }

  const compDirs =
    (await listDirs(path.join(dir, "components"))) ||
    (await listDirs(path.join(dir, "src", "components")));
  if (compDirs.length > 0) {
    result.components.shared = { count: compDirs.length, path: "components" };
  }

  return result;
}

async function detectVue(dir) {
  const result = {
    pages: [],
    features: [],
    components: {
      shared: { count: 0, path: null },
      page: { count: 0, path: null },
    },
    routes: [],
  };

  for (const candidate of ["src/views", "src/pages"]) {
    const dirs = await listDirs(path.join(dir, candidate));
    if (dirs.length > 0) {
      result.pages = dirs.map((d) => ({
        name: d,
        path: path.join(candidate, d),
        route: `/${d.toLowerCase()}`,
      }));
      result.components.page = { count: dirs.length, path: candidate };
      break;
    }
  }

  const compDirs = await listDirs(path.join(dir, "src", "components"));
  if (compDirs.length > 0) {
    result.components.shared = {
      count: compDirs.length,
      path: "src/components",
    };
  }

  return result;
}

async function detectAngular(dir) {
  const result = {
    pages: [],
    features: [],
    components: {
      shared: { count: 0, path: null },
      page: { count: 0, path: null },
    },
    routes: [],
  };

  const appDirs = await listDirs(path.join(dir, "src", "app"));
  const pageDirs = appDirs.filter(
    (d) => d.endsWith("-page") || d.startsWith("page-"),
  );
  const featureDirs = appDirs.filter(
    (d) =>
      !d.startsWith("_") &&
      !pageDirs.includes(d) &&
      d !== "shared" &&
      d !== "core",
  );

  result.pages = pageDirs.map((d) => ({
    name: d,
    path: `src/app/${d}`,
    route: `/${d.replace(/-page$/, "")}`,
  }));
  result.features = featureDirs.map((d) => ({
    name: d,
    path: `src/app/${d}`,
    type: "angular-module",
  }));
  result.components.page = { count: pageDirs.length, path: "src/app" };

  return result;
}

async function detectDotnet(dir) {
  const result = {
    pages: [],
    features: [],
    components: {
      shared: { count: 0, path: null },
      page: { count: 0, path: null },
    },
    routes: [],
  };
  const dirs = await listDirs(dir);
  const projectDirs = dirs.filter(
    (d) =>
      !d.includes(".Tests") &&
      !d.startsWith(".") &&
      !d.includes("node_modules"),
  );
  const testDirs = dirs.filter((d) => d.includes(".Tests"));

  result.features = projectDirs.map((d) => ({
    name: d,
    path: d,
    type: "dotnet-project",
  }));
  return result;
}

async function detectGeneric(dir) {
  return {
    pages: [],
    features: [],
    components: {
      shared: { count: 0, path: null },
      page: { count: 0, path: null },
    },
    routes: [],
  };
}

function guessRouteFromPageName(name) {
  const cleaned = name
    .replace(/^Page/, "")
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
  return `/${cleaned}`;
}

async function findRouteFile(dir) {
  const candidates = [
    "src/routes/routesData.js",
    "src/routes/index.js",
    "src/router/index.js",
    "src/routes.js",
    "src/App.routes.js",
  ];
  for (const c of candidates) {
    const full = path.join(dir, c);
    if (await fileExists(full)) return full;
  }
  return null;
}

async function parseSimpleRoutes(filePath) {
  const content = await safeReadFile(filePath);
  if (!content) return [];

  const routes = [];
  const pathRegex = /path:\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = pathRegex.exec(content)) !== null) {
    routes.push({
      path: match[1],
      component: null,
      isPrivate: content.includes(`isPrivate: true`),
    });
  }
  return routes;
}

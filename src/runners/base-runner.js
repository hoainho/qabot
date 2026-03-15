export class BaseRunner {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
  }

  async isAvailable(projectDir) {
    throw new Error(`${this.name}: isAvailable not implemented`);
  }
  buildCommand(options) {
    throw new Error(`${this.name}: buildCommand not implemented`);
  }
  parseOutput(stdout, stderr, exitCode) {
    throw new Error(`${this.name}: parseOutput not implemented`);
  }
  getDisplayName() {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
}

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const packages = [
  '.',
  'packages/sdk',
  'apps/api/slack'
];

function installDeps(packagePath) {
  const fullPath = path.join(__dirname, packagePath);
  if (existsSync(path.join(fullPath, 'package.json'))) {
    console.log(`\nInstalling dependencies for ${packagePath}`);
    try {
      execSync('npm install', { 
        cwd: fullPath, 
        stdio: 'inherit'
      });
      console.log(`✓ Successfully installed dependencies for ${packagePath}`);
    } catch (error) {
      console.error(`× Failed to install dependencies for ${packagePath}`);
      console.error(error.message);
    }
  }
}

console.log('Installing dependencies for all packages...');
packages.forEach(installDeps);
console.log('\nDependency installation complete.');

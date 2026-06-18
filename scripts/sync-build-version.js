const fs = require("node:fs");
const path = require("node:path");

const rootDirectory = path.resolve(__dirname, "..");
const versionFile = path.join(rootDirectory, "build-version.ini");
const packageFile = path.join(rootDirectory, "package.json");
const packageLockFile = path.join(rootDirectory, "package-lock.json");
const indexFile = path.join(rootDirectory, "index.html");

function readBuildVersion() {
  const text = fs.readFileSync(versionFile, "utf8");
  const versionLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith(";") && line.includes("="));

  if (!versionLine) {
    throw new Error("build-version.ini must contain a version entry, for example: version=0.4");
  }

  const [key, ...valueParts] = versionLine.split("=");
  if (key.trim().toLowerCase() !== "version") {
    throw new Error("build-version.ini must use the key 'version'.");
  }

  const version = valueParts.join("=").trim();
  if (!/^\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid build version '${version}'. Use a value like 0.4 or 0.4.1.`);
  }

  return version;
}

function toPackageVersion(version) {
  const [main, suffix = ""] = version.split(/(?=[-+])/);
  const parts = main.split(".");
  while (parts.length < 3) {
    parts.push("0");
  }

  return `${parts.join(".")}${suffix}`;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function syncPackage(version, packageVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  const executableBaseName = `Project-Roulette-${version}`;

  packageJson.version = packageVersion;
  packageJson.build.win.executableName = executableBaseName;
  packageJson.build.portable.artifactName = `${executableBaseName}.exe`;

  writeJson(packageFile, packageJson);
}

function syncPackageLock(packageVersion) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockFile, "utf8"));

  packageLock.version = packageVersion;
  if (packageLock.packages && packageLock.packages[""]) {
    packageLock.packages[""].version = packageVersion;
  }

  writeJson(packageLockFile, packageLock);
}

function syncIndex(version) {
  const html = fs.readFileSync(indexFile, "utf8");
  const versionPattern = /<p class="eyebrow">v[^<]+<\/p>/;

  if (!versionPattern.test(html)) {
    throw new Error("Could not find the version eyebrow in index.html.");
  }

  const updated = html.replace(
    versionPattern,
    `<p class="eyebrow">v${version}</p>`
  );

  fs.writeFileSync(indexFile, updated);
}

const version = readBuildVersion();
const packageVersion = toPackageVersion(version);

syncPackage(version, packageVersion);
syncPackageLock(packageVersion);
syncIndex(version);

console.log(`Synced build version ${version} (package version ${packageVersion}).`);

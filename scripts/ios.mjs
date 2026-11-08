import { spawnSync } from "node:child_process";
import { exit } from "node:process";

const task = process.argv[2];
if (process.platform !== "darwin")
  throw new Error(
    "iPhone builds require macOS and Xcode. Web development does not.",
  );
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) exit(result.status ?? 1);
}
if (task === "format" || task === "format-check") {
  run("xcrun", [
    "swift-format",
    task === "format" ? "format" : "lint",
    task === "format" ? "--in-place" : "--strict",
    "--recursive",
    "ios/Sources",
    "ios/Tests",
    "ios/UITests",
  ]);
} else if (task === "build" || task === "test") {
  run("xcodegen", ["generate", "--spec", "ios/project.yml"]);
  const args = [
    "-project",
    "ios/BuildConnect.xcodeproj",
    "-scheme",
    "BuildConnect",
    "-configuration",
    "Debug",
    "-derivedDataPath",
    "ios/.build",
    "CODE_SIGN_IDENTITY=-",
  ];
  if (task === "test") {
    const result = spawnSync(
      "xcrun",
      ["simctl", "list", "devices", "available", "--json"],
      { encoding: "utf8" },
    );
    if (result.status !== 0)
      throw new Error("Unable to list iPhone simulators.");
    const devices = Object.values(JSON.parse(result.stdout).devices).flat();
    const device =
      devices.find((device) => device.udid === process.env.IOS_SIMULATOR_ID) ??
      devices.find(
        (device) =>
          device.name.startsWith("iPhone") && device.state === "Booted",
      ) ??
      devices.find((device) => device.name.startsWith("iPhone"));
    if (!device)
      throw new Error("Install an iOS simulator runtime in Xcode first.");
    args.push("-destination", `platform=iOS Simulator,id=${device.udid}`);
  } else args.push("-sdk", "iphonesimulator");
  run("xcodebuild", [...args, task, ...process.argv.slice(3)]);
} else throw new Error("Choose build, test, format, or format-check.");

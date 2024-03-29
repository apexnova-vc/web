import fs from "fs";
import path from "path";

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

import paths from "./paths";

export interface Env {
  NODE_ENV: string;
  PUBLIC_URL: string;
  WDS_SOCKET_HOST?: string;
  WDS_SOCKET_PATH?: string;
  WDS_SOCKET_PORT?: string;
  FAST_REFRESH: boolean;
  [key: string]: string | boolean | undefined;
}

export interface ClientEnvironment {
  raw: Env;
  stringified: {
    "process.env": { [key: string]: string };
  };
}

const NODE_ENV = process.env.NODE_ENV;

if (!NODE_ENV) {
  throw new Error(
    "The NODE_ENV environment variable is required but was not specified.",
  );
}

const dotenvFiles = [
  `${paths.dotenv}.${NODE_ENV}.local`,
  NODE_ENV !== "test" && `${paths.dotenv}.local`,
  `${paths.dotenv}.${NODE_ENV}`,
  paths.dotenv,
].filter(Boolean);

dotenvFiles.forEach((dotenvFile) => {
  if (fs.existsSync(dotenvFile as string)) {
    dotenvExpand.expand(
      dotenv.config({
        path: dotenvFile as string,
      }),
    );
  }
});

const appDirectory = fs.realpathSync(process.cwd());
process.env.NODE_PATH = (process.env.NODE_PATH || "")
  .split(path.delimiter)
  .filter((folder) => folder && !path.isAbsolute(folder))
  .map((folder) => path.resolve(appDirectory, folder))
  .join(path.delimiter);

const REACT_APP = /^REACT_APP_/i;

export default function getClientEnvironment(
  publicUrl: string,
): ClientEnvironment {
  const raw = Object.keys(process.env)
    .filter((key) => REACT_APP.test(key))
    .reduce(
      (env, key) => {
        env[key] = process.env[key];
        return env;
      },
      {
        NODE_ENV: process.env.NODE_ENV || "development",
        PUBLIC_URL: publicUrl,
        WDS_SOCKET_HOST: process.env.WDS_SOCKET_HOST,
        WDS_SOCKET_PATH: process.env.WDS_SOCKET_PATH,
        WDS_SOCKET_PORT: process.env.WDS_SOCKET_PORT,
        FAST_REFRESH: process.env.FAST_REFRESH !== "false",
      },
    );
  // Stringify all values so we can feed into webpack DefinePlugin
  const stringified: { "process.env": { [key: string]: string } } = {
    "process.env": Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
  };

  return { raw, stringified };
}

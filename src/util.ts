import fs from "fs";

export class WrongFileNameInCommandError extends Error {
  static {
    this.prototype.name = "WrongFileNameInCommandError";
  }
}

export function readFileSync(file_name: string, code_block_label: string): string {
  if (!fs.existsSync(file_name)) {
    throw new WrongFileNameInCommandError(` FILE NOT FOUND 
Cannot find a file "${file_name}" mentioned in the code block labeled "${code_block_label}" `);
  }
  return fs.readFileSync(file_name, { encoding: "utf-8" });
}

export type TestRes = { is_success: Boolean, message: string, additionally?: unknown };

export type Config = {
  src: string;
  is_quiet?: boolean;
};

export function trimEndOnAllLines(str: string) {
  return str.split("\n").map(line => line.trimEnd()).join("\n");
}

export function FILTER(s: string): string {
  return trimEndOnAllLines(s.replace(/\r?\n/g, "\n"))
}

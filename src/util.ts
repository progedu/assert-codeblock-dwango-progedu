import fs from "fs";

export class WrongFileNameInCommandError extends Error {
  static {
    this.prototype.name = "WrongFileNameInCommandError";
  }
}

export function readFileSync(file_name: string, code_block_label: string, line_num:number): string {
  if (!fs.existsSync(file_name)) {
    throw new WrongFileNameInCommandError(` FILE NOT FOUND 
Cannot find a file "${file_name}" mentioned in the code block labeled "${code_block_label}" at line:${line_num}`);
  }
  return fs.readFileSync(file_name, { encoding: "utf-8" });
}

export type CommandType = "Exact" | "Diff" | "Partial" | "DiffPartial" | "Undefined";
export type ResultType = "Success" | "Mismatch" | "TextbookNotFound" | "WrongFileNameInCommand" | "LineNumMismatch" | "LineNumMissing" | "UnknownCommand" | "UnknownError";

export type ResBody = {
  command_type: CommandType,
  result_type: ResultType,
  message: string,
  textbook_filepath: string,
  codeblock_line_num: number,
  message_except_content?:string,
  codeblock_label?: string,
  textbook_content?: string,
  sample_content?: string,
  textbook_topnum?: string,
  sample_topnum?: string,
}

export type TestRes = { is_success: Boolean, body: ResBody, additionally?: unknown };

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

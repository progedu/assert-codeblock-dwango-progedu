import fs from "fs";
import { structuredPatch } from 'diff';

class WrongFileNameInCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WrongFileNameInCommandError";
  }
}

function readFileSync(file_name: string, context: string): string {
  if (!fs.existsSync(file_name)) {
    throw new WrongFileNameInCommandError(` FILE NOT FOUND 
Cannot find a file "${file_name}" mentioned in the code block labeled "${context}" `);
  }
  return fs.readFileSync(file_name, { encoding: "utf-8" });
}

function getDiffFromFileNames(oldFileName: string, newFileName: string, context: string) {
  const oldStr = readFileSync(oldFileName, context);
  const newStr = readFileSync(newFileName, context);
  const diff = structuredPatch(oldFileName, newFileName, oldStr, newStr, "", "", { context: 1e6 });
  const ret: string[] = [];
  for (let i = 0; i < diff.hunks.length; i++) {
    ret.push(...diff.hunks[i].lines);
  }
  return ret.join('\n') + '\n';
}

function trimEndOnAllLines(str: string) {
  return str.split("\n").map(line => line.trimEnd()).join("\n");
}


export function inspect_codeblock(textbook_filepath: string, config: { src: string }): boolean {
  let all_success = true;
  inspect_codeblock_and_return_message(textbook_filepath, config).forEach(({ is_success, message, additionally }) => {
    if (is_success) {
      console.log(`\x1b[32m${message}\x1b[0m`);
    } else {
      console.log(`\x1b[33m${message}\x1b[0m`);
    }

    if (additionally) {
      console.log(additionally);
    }

    if (!is_success) {
      all_success = false;
    }
  });
  return all_success;
}

type TestRes = { is_success: Boolean, message: string, additionally?: unknown };

function handle_exact(textbook_filepath: string, command_args: string[], matched_file_content: string, src_folder: string): TestRes {
  const sample_file_name = command_args[1];
  const sample_file_path = src_folder + sample_file_name;
  const sample_file_content = readFileSync(sample_file_path, command_args.join(" ")).replace(/\r?\n/g, "\n");
  if (matched_file_content !== sample_file_content) {
    return {
      is_success: false,
      message: ` MISMATCH FOUND 
in ${textbook_filepath}
with the code block labeled ${sample_file_name}
Please compare the textbook with the content of ${sample_file_path} `
    };
  } else {
    return {
      is_success: true,
      message:
        ` OK: "${textbook_filepath}" のコードブロック "exact ${sample_file_name}" は "${sample_file_path}" と一致しています`
    };
  }
}

function handle_diff(textbook_filepath: string, command_args: string[], matched_file_content: string, src_folder: string): TestRes {
  const old_sample_file_name = command_args[1];
  const new_sample_file_name = command_args[2];
  const old_sample_file_path = src_folder + old_sample_file_name;
  const new_sample_file_path = src_folder + new_sample_file_name;
  const actual_diff = getDiffFromFileNames(old_sample_file_path, new_sample_file_path, command_args.join(" "));
  // 空行に対しての trailing space でテストが落ちるのはしょうもないので、あらかじめ両者から削っておく
  if (trimEndOnAllLines(matched_file_content) !== trimEndOnAllLines(actual_diff)) {
    return {
      is_success: false, message: ` MISMATCH FOUND 
in ${textbook_filepath}
with the code block labeled "diff ${old_sample_file_name} ${new_sample_file_name}"
The diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${actual_diff}\`\`\` 
But the content in the textbook is as follows: \n\`\`\`\n${matched_file_content}\`\`\` 
`};
  } else {
    return {
      is_success: true,
      message: ` OK: "${textbook_filepath}" のコードブロック "diff ${old_sample_file_name} ${new_sample_file_name}" は "${old_sample_file_path}" と "${new_sample_file_path}" の diff と一致しています`
    };
  }
}

function handle_partial(textbook_filepath: string, command_args: string[], matched_file_content: string, src_folder: string): TestRes {
  const starting_line_num = Number(command_args[2]);
  const sample_file_name = command_args[1];
  const sample_file_path = src_folder + sample_file_name;
  const sample_file_content = readFileSync(sample_file_path, command_args.join(" ")).replace(/\r?\n/g, "\n");

  // 末尾の改行を削って行数を数える
  const 行数 = matched_file_content.trimEnd().split("\n").length;

  // 1-index で与えられているので、実際に配列アクセスするときには 1 を引いておく必要がある
  const partial_content = sample_file_content.split("\n").slice(starting_line_num - 1, starting_line_num - 1 + 行数).join("\n");

  // 空行に対しての trailing space でテストが落ちるのはしょうもないので、あらかじめ両者から削っておく
  if (trimEndOnAllLines(partial_content.trimEnd()) !== trimEndOnAllLines(matched_file_content.trimEnd())) {
    return {
      is_success: false,
      message: ` MISMATCH FOUND 
          in ${textbook_filepath}
          with the code block labeled "partial ${sample_file_name} ${starting_line_num}"
         Please compare the textbook with the content of ${sample_file_path} `,
      additionally: { partial_content, matched_file_content },
    }
  } else {
    return {
      is_success: true,
      message: ` OK: "${textbook_filepath}" のコードブロック "partial ${sample_file_name} ${starting_line_num}" は "${sample_file_path}" の ${starting_line_num} 行目からの ${行数} 行と一致しています`
    };
  }
}

export function inspect_codeblock_and_return_message(textbook_filepath: string, config: { src: string }): TestRes[] {
  if (!fs.existsSync(textbook_filepath)) {
    return [{
      is_success: false,
      message: ` INCORRECT TEXTBOOK FILEPATH "${textbook_filepath}"`
    }];
  }
  const textbook_content = fs.readFileSync(textbook_filepath, { encoding: "utf-8" }).replace(/\r?\n/g, "\n");
  const match = [...textbook_content.matchAll(/<!--\s*assert[-_]codeblock\s+(.*?)-->[\n\s]*```(.*?)\n([\s\S]*?)```/gm)]
  if (!match.length) return [];

  console.log(`\n\x1b[34m assert-codeblock: ${textbook_filepath} をチェック中\x1b[0m`);
  return match.map(m => m.slice(1)).map(
    ([command, file_type, matched_file_content]) => {
      try {
        const command_args = command.trim().split(/\s+/);
        if (command_args[0] === "exact") {
          return handle_exact(textbook_filepath, command_args, matched_file_content, config.src);
        } else if (command_args[0] === "diff") {
          return handle_diff(textbook_filepath, command_args, matched_file_content, config.src);
        } else if (command_args[0] === "partial") {
          return handle_partial(textbook_filepath, command_args, matched_file_content, config.src);
        } else {
          return {
            is_success: false,
            message: ` assert-codeblock は ${JSON.stringify(command)} というコマンドをサポートしていません`
          }
        }
      } catch (e) {
        if (e instanceof WrongFileNameInCommandError) {
          return {
            is_success: false,
            message: e.message
          };
        } else {
          throw e;
        }
      }
    }
  );
}

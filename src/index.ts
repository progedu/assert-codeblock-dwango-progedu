import fs from "fs";
import { structuredPatch } from 'diff';
import { PatchApplyError, apply_diff, apply_diff_on_lines } from "./apply_diff";

class WrongFileNameInCommandError extends Error {
  static {
    this.prototype.name = "WrongFileNameInCommandError";
  }
}

function readFileSync(file_name: string, code_block_label: string): string {
  if (!fs.existsSync(file_name)) {
    throw new WrongFileNameInCommandError(` FILE NOT FOUND 
Cannot find a file "${file_name}" mentioned in the code block labeled "${code_block_label}" `);
  }
  return fs.readFileSync(file_name, { encoding: "utf-8" });
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
      console.log(`\x1b[31m${message}\x1b[0m`);
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

function FILTER(s: string): string {
  return trimEndOnAllLines(s.replace(/\r?\n/g, "\n"))
}

function handle_diff(textbook_filepath: string, command_args: string[], expected_diff: string, src_folder: string): TestRes {
  const old_sample_file_name = command_args[1];
  const new_sample_file_name = command_args[2];
  const old_sample_file_path = src_folder + old_sample_file_name;
  const new_sample_file_path = src_folder + new_sample_file_name;
  const code_block_label = command_args.join(" ");
  const oldStr = readFileSync(old_sample_file_path, code_block_label);
  const newStr = readFileSync(new_sample_file_path, code_block_label);
  const actual_diff = (() => {
    const diff = structuredPatch(old_sample_file_path, new_sample_file_path, oldStr, newStr, "", "", { context: 1e6 });
    const ret: string[] = [];
    for (let i = 0; i < diff.hunks.length; i++) {
      ret.push(...diff.hunks[i].lines);
    }
    return ret.join('\n') + '\n';
  })();

  try {
    let expected_newStr = apply_diff(oldStr, trimEndOnAllLines(expected_diff))

    // 空行に対しての trailing space でテストが落ちるのはしょうもないので、あらかじめ両者から削っておく
    // 一方で、行頭のスペースは、差があったら落とす方針にする
    if (FILTER(expected_newStr) === FILTER(newStr)) {
      // diff というものは一意ではないので、
      // diff ライブラリが生成した「A と B の 差分」と教材に書いてある「A と B の差分」は一致する保証がない。
      // 「ファイル A に対して、教材に書いてある通りの diff を適用すると、ファイル B になる」かどうかを検査しなければいけない。
      return {
        is_success: true,
        message: ` OK: "${textbook_filepath}" のコードブロック "diff ${old_sample_file_name} ${new_sample_file_name}" を "${old_sample_file_path}" に適用すると "${new_sample_file_path}" と一致しています`
      };
    } else if (trimEndOnAllLines(expected_diff) === trimEndOnAllLines(actual_diff)) {
      // diff が一致してくれたら、OK
      return {
        is_success: true,
        message: ` OK: "${textbook_filepath}" のコードブロック "diff ${old_sample_file_name} ${new_sample_file_name}" は "${old_sample_file_path}" と "${new_sample_file_path}" の diff と一致しています`
      };
    } else {
      return {
        is_success: false, message: ` MISMATCH FOUND 
in ${textbook_filepath}
with the code block labeled "diff ${old_sample_file_name} ${new_sample_file_name}"
The diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${actual_diff}\`\`\` 
But the content in the textbook is as follows: \n\`\`\`\n${expected_diff}\`\`\` 
`};
    }
  } catch (e) {
    if (e instanceof PatchApplyError) {
      return {
        is_success: false, message: `  CANNOT APPLY THE PATCH
[original message: \`${e.message}\`]
in ${textbook_filepath}
with the code block labeled "diff ${old_sample_file_name} ${new_sample_file_name}"
The diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${actual_diff}\`\`\` 
But the content in the textbook is as follows: \n\`\`\`\n${expected_diff}\`\`\` `
      }
    } else { throw e; }
  }
}

function handle_diff_partial(textbook_filepath: string, command_args: string[], expected_diff: string, src_folder: string): TestRes {
  const old_sample_file_name = command_args[1];
  const new_sample_file_name = command_args[2];
  if (command_args[3] === undefined) {
    return {
      is_success: false,
      message: ` INSUFFICIENT ARGUMENT: LINE NUMBER MISSING 
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"
Note that 'assert-codeblock diff-partial' requires two file names AND one or two line number at which the diff starts: 
for example, <!-- assert-codeblock diff-partial 1-1.py 1-2.py 13 -->, in which the old and the new line numbers both start at 13,
or <!-- assert-codeblock diff-partial 1-1.py 1-2.py 13 14 -->, in which the old line number starts at 13 but the new one starts at 14.`,
    }
  }
  const starting_line_num = Number(command_args[3]) - 1;
  const old_starting_line_num = command_args[4] === undefined ? starting_line_num : Number(command_args[4]) - 1;

  const old_sample_file_path = src_folder + old_sample_file_name;
  const new_sample_file_path = src_folder + new_sample_file_name;
  const code_block_label = command_args.join(" ");
  const oldStr = readFileSync(old_sample_file_path, code_block_label);
  const newStr = readFileSync(new_sample_file_path, code_block_label);
  const entire_diff = (() => {
    const diff = structuredPatch(old_sample_file_path, new_sample_file_path, oldStr, newStr, "", "", { context: 1e6 });
    const ret: string[] = [];
    for (let i = 0; i < diff.hunks.length; i++) {
      ret.push(...diff.hunks[i].lines);
    }
    return ret.join('\n') + '\n';
  })();

  try {
    const diffStr = trimEndOnAllLines(expected_diff);
    const old_str_lines = oldStr.split("\n");
    const diff_lines = diffStr.split("\n");
    // split すると配列末尾に空文字列が入るが、これは要らないので削除
    if (diff_lines[diff_lines.length - 1] === "") {
      diff_lines.length--;
    }
    let expected_newStr_lines = FILTER(apply_diff_on_lines(old_str_lines, diff_lines, old_starting_line_num).join("\n")).split("\n");
    let actual_newStr_lines = FILTER(newStr).split("\n");

    if (actual_newStr_lines.slice(starting_line_num).join("\n").startsWith(expected_newStr_lines.join("\n"))) {
      return {
        is_success: true,
        message: ` OK: "${textbook_filepath}" のコードブロック "${command_args.join(" ")}" を "${old_sample_file_path}" の ${old_starting_line_num + 1} 行目からに適用すると "${new_sample_file_path}" の ${starting_line_num + 1} 行目からと一致しています`
      };
    } else {
      return {
        is_success: false, message: ` MISMATCH FOUND 
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"
**************************************
DEBUG MESSAGE
\`actual_newStr_lines.slice(starting_line_num).join("\n")\` is 
\`\`\`
${actual_newStr_lines.slice(starting_line_num).join("\n")}\`\`\`
which does not start with \`expected_newStr_lines.join("\n")\`, which is
\`\`\`
${expected_newStr_lines.join("\n")}\`\`\`
**************************************
The full diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${entire_diff}\`\`\` 
The content in the textbook, intended to be the partial diff, is as follows: \n\`\`\`\n${expected_diff}\`\`\` 
`};
    }
  } catch (e) {
    if (e instanceof PatchApplyError) {
      return {
        is_success: false, message: `  CANNOT APPLY THE PATCH
[original message: \`${e.message}\`]
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"
The full total diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${entire_diff}\`\`\` 
The content in the textbook, intended to be the partial diff, is as follows: \n\`\`\`\n${expected_diff}\`\`\` `
      }
    } else { throw e; }
  }
}

function handle_partial(textbook_filepath: string, command_args: string[], matched_file_content: string, src_folder: string): TestRes {
  if (command_args[2] === undefined) {
    return {
      is_success: false,
      message: ` INSUFFICIENT ARGUMENT: LINE NUMBER MISSING 
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"
Note that 'assert-codeblock partial' requires a file name AND its line number: 
for example, <!-- assert-codeblock partial 1-1.py 4 --> `,
    }
  }
  const starting_line_num = Number(command_args[2]);
  const sample_file_name = command_args[1];
  const sample_file_path = src_folder + sample_file_name;
  const sample_file_content = readFileSync(sample_file_path, command_args.join(" ")).replace(/\r?\n/g, "\n");

  // 末尾の改行を削って行数を数える
  const 行数 = matched_file_content.trimEnd().split("\n").length;

  // 1-index で与えられているので、実際に配列アクセスするときには 1 を引いておく必要がある
  const partial_content = sample_file_content.split("\n").slice(starting_line_num - 1, starting_line_num - 1 + 行数).join("\n");

  // 空行に対しての trailing space でテストが落ちるのはしょうもないので、あらかじめ両者から削っておく
  // 一方で、行頭のスペースは、差があったら落とす方針にする
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

  /* partial に書いてある先頭行番号が 直前の topnum= に書いてある行番号と異なっていたら怒る */
  const whether_consistent_with_topnum = [...textbook_content.matchAll(/topnum\s*=\s*(?<topnum>"\d+"|'\d+'|\d+)[^>]*>[\n\s]*<!--\s*assert[-_]codeblock\s+partial\s+(?<remaining_args>.*?)-->/gm)];

  // 怒りを蓄えるための配列
  const inconsistent_topnum_msg: TestRes[] = whether_consistent_with_topnum.flatMap(a => {
    const { topnum, remaining_args } = a.groups as { topnum: string, remaining_args: string };
    // たとえば、topnum: '45', remaining_args: '10-3.js 45 '

    // remaining_args の方は簡単
    const expected_topnum = remaining_args.trim().split(/\s+/)[1];

    // 一方で、topnum は '45', '"45"', "'45'" のどれの可能性もあるのが厄介。めんどいので replace でごり押し
    const actual_topnum = topnum.replaceAll(/['"]/g, "");

    if (expected_topnum === actual_topnum) {
      return [];
    } else {
      return [{
        is_success: false,
        message: ` MISMATCH FOUND: コマンド "partial ${remaining_args}" には行番号が ${expected_topnum} から始まると書いてありますが、直前の topnum= には行番号が ${actual_topnum} から始まると書いてあります`
      }];
    }
  });

  return [
    ...inconsistent_topnum_msg,
    ...(() => {
      const match = [...textbook_content.matchAll(/<!--\s*assert[-_]codeblock\s+(.*?)-->[\n\s]*(?<code_fence>`{3,}|~{3,})([\w\d -.]*?)\n([\s\S]*?)\k<code_fence>/gm)];
      if (!match.length) return [];

      console.log(`\n\x1b[34m assert-codeblock: ${textbook_filepath} をチェック中\x1b[0m`);
      return match.map(([_, command, code_fence, file_type, matched_file_content]) =>
        run_command_and_get_result(textbook_filepath, command, matched_file_content, config)
      );
    })()];
}

function run_command_and_get_result(textbook_filepath: string, command: string, matched_file_content: string, config: { src: string }): TestRes {
  try {
    const command_args = command.trim().split(/\s+/);
    if (command_args[0] === "exact") {
      return handle_exact(textbook_filepath, command_args, matched_file_content, config.src);
    } else if (command_args[0] === "diff") {
      return handle_diff(textbook_filepath, command_args, matched_file_content, config.src);
    } else if (command_args[0] === "partial") {
      return handle_partial(textbook_filepath, command_args, matched_file_content, config.src);
    } else if (command_args[0] === "diff-partial") {
      return handle_diff_partial(textbook_filepath, command_args, matched_file_content, config.src);
    } else {
      return {
        is_success: false,
        message: ` assert-codeblock は ${JSON.stringify(command)} というコマンドをサポートしていません`
      };
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

export function run_all_tests(textbook_filepath_arr: string[], config: { src: string }) {
  let count_all = 0;
  let count_success = 0;

  textbook_filepath_arr.forEach(textbook_filepath => {
    inspect_codeblock_and_return_message(textbook_filepath, config).forEach(({ is_success, message, additionally }) => {
      if (is_success) {
        count_all++;
        count_success++;
        console.log(`\x1b[32m${message}\x1b[0m`);
      } else {
        count_all++;
        console.log(`\x1b[31m${message}\x1b[0m`);
      }

      if (additionally) {
        console.log(additionally);
      }
    });
  })

  if (count_all === count_success) {
    console.log(`\n assert-codeblock: 全てチェックしました`);
    console.log("\x1b[32m✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅\x1b[0m")
    console.log(`\x1b[32m  all tests passed (${count_success}/${count_all} successful) \x1b[0m`)
    console.log("\x1b[32m✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅\x1b[0m")
    return true;
  } else {
    console.error(`\n assert-codeblock: 全てチェックしました`);
    console.error(`❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌`);
    console.error(`\x1b[31m  SOME TESTS FAILED (${count_success}/${count_all} successful)\x1b[0m`);
    console.error(`❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌`);
    return false;
  }
}

export function run_all_tests_and_exit(textbook_filepath_arr: string[], config: { src: string }) {
  if (run_all_tests(textbook_filepath_arr, config)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}
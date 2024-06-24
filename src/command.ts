import { FILTER, TestRes, WrongFileNameInCommandError, readFileSync, trimEndOnAllLines } from "./util";
import { structuredPatch } from 'diff';
import { PatchApplyError, apply_diff, apply_diff_on_lines } from "./apply_diff";

function handle_exact(textbook_filepath: string, command_args: string[], matched_file_content: string, src_folder: string, matched_label_index: number): TestRes {
  const sample_file_name = command_args[1];
  const sample_file_path = src_folder + sample_file_name;
  const sample_file_content = readFileSync(sample_file_path, command_args.join(" ")).replace(/\r?\n/g, "\n");
  if (matched_file_content !== sample_file_content) {
    return {
      is_success: false,
      body: {
        command_type: "Exact",
        result_type: "Mismatch",
        message: ` MISMATCH FOUND
in ${textbook_filepath}
with the code block labeled ${sample_file_name}
Please compare the textbook with the content of ${sample_file_path} `,
        textbook_filepath: textbook_filepath,
        codeblock_matched_index: matched_label_index,
        codeblock_label: command_args.join(" "),
        textbook_content: matched_file_content,
        sample_content: sample_file_content,
      }
    };
  } else {
    return {
      is_success: true,
      body: {
        command_type: "Exact",
        result_type: "Success",
        message: ` OK: "${textbook_filepath}" のコードブロック "exact ${sample_file_name}" は "${sample_file_path}" と一致しています`,
        textbook_filepath: textbook_filepath,
        codeblock_matched_index: matched_label_index,
        codeblock_label: command_args.join(" "),
      }
    };
  }
}

function handle_diff(textbook_filepath: string, command_args: string[], expected_diff: string, src_folder: string, matched_label_index: number): TestRes {
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
        body: {
          command_type: "Diff",
          result_type: "Success",
          message: ` OK: "${textbook_filepath}" のコードブロック "diff ${old_sample_file_name} ${new_sample_file_name}" を "${old_sample_file_path}" に適用すると "${new_sample_file_path}" と一致しています`,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: matched_label_index,
        }
      };
    } else if (trimEndOnAllLines(expected_diff) === trimEndOnAllLines(actual_diff)) {
      // diff が一致してくれたら、OK
      return {
        is_success: true,
        body: {
          command_type: "Diff",
          result_type: "Success",
          message: ` OK: "${textbook_filepath}" のコードブロック "diff ${old_sample_file_name} ${new_sample_file_name}" は "${old_sample_file_path}" と "${new_sample_file_path}" の diff と一致しています`,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: matched_label_index,
        }
      };
    } else {
      return {
        is_success: false,
        body: {
          command_type: "Diff",
          result_type: "Mismatch",
          message: ` MISMATCH FOUND
in ${textbook_filepath}
with the code block labeled "diff ${old_sample_file_name} ${new_sample_file_name}"
The diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${actual_diff}\`\`\`
But the content in the textbook is as follows: \n\`\`\`\n${expected_diff}\`\`\` `,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: matched_label_index,
          codeblock_label: code_block_label,
          textbook_content: expected_diff,
          sample_content: actual_diff,
        },
      };
    }
  } catch (e) {
    if (e instanceof PatchApplyError) {
      return {
        is_success: false,
        body: {
          command_type: "Diff",
          result_type: "Mismatch",// CANNOT APPLY THE PATCH 用の方が欲しい
          message: `  CANNOT APPLY THE PATCH
[original message: \`${e.message}\`]
in ${textbook_filepath}
with the code block labeled "diff ${old_sample_file_name} ${new_sample_file_name}"
The diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${actual_diff}\`\`\`
But the content in the textbook is as follows: \n\`\`\`\n${expected_diff}\`\`\` `,
          message_except_content: `  CANNOT APPLY THE PATCH
[original message: \`${e.message}\`]
in ${textbook_filepath}
with the code block labeled "diff ${old_sample_file_name} ${new_sample_file_name}"`,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: matched_label_index,
          codeblock_label: code_block_label,
          textbook_content: expected_diff,
          sample_content: actual_diff,
        },
      }
    } else { throw e; }
  }
}

function handle_partial(textbook_filepath: string, command_args: string[], matched_file_content: string, src_folder: string, matched_label_index: number): TestRes {
  if (command_args[2] === undefined) {
    return {
      is_success: false,
      body: {
        command_type: "Partial",
        result_type: "LineNumMissing",
        message: ` INSUFFICIENT ARGUMENT: LINE NUMBER MISSING
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"\
Note that 'assert-codeblock partial' requires a file name AND its line number:
for example, <!-- assert-codeblock partial 1-1.py 4 --> `,
        textbook_filepath: textbook_filepath,
        codeblock_matched_index: matched_label_index,
        codeblock_label: command_args.join(" "),
      }
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
      body: {
        command_type: "Partial",
        result_type: "Mismatch",
        message: ` MISMATCH FOUND
in ${textbook_filepath}
with the code block labeled "partial ${sample_file_name} ${starting_line_num}"
Please compare the textbook with the content of ${sample_file_path} `,
        textbook_filepath: textbook_filepath,
        codeblock_matched_index: matched_label_index,
        codeblock_label: command_args.join(" "),
        textbook_content: matched_file_content,
        sample_content: partial_content,
      },
      additionally: { partial_content, matched_file_content },
    }
  } else {
    return {
      is_success: true,
      body: {
        command_type: "Partial",
        result_type: "Success",
        message: ` OK: "${textbook_filepath}" のコードブロック "partial ${sample_file_name} ${starting_line_num}" は "${sample_file_path}" の ${starting_line_num} 行目からの ${行数} 行と一致しています`,
        textbook_filepath: textbook_filepath,
        codeblock_matched_index: matched_label_index,
        codeblock_label: command_args.join(" "),
      }
    };
  }
}

function handle_diff_partial(textbook_filepath: string, command_args: string[], expected_diff: string, src_folder: string, matched_label_index:number): TestRes {
  const old_sample_file_name = command_args[1];
  const new_sample_file_name = command_args[2];
  if (command_args[3] === undefined) {
    return {
      is_success: false,
      body: {
        command_type: "DiffPartial",
        result_type: "LineNumMissing",
        message: ` INSUFFICIENT ARGUMENT: LINE NUMBER MISSING
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"
Note that 'assert-codeblock diff-partial' requires two file names AND one or two line number at which the diff starts:
for example, <!-- assert-codeblock diff-partial 1-1.py 1-2.py 13 -->, in which the old and the new line numbers both start at 13,
or <!-- assert-codeblock diff-partial 1-1.py 1-2.py 13 14 -->, in which the old line number starts at 13 but the new one starts at 14.`,
        textbook_filepath: textbook_filepath,
        codeblock_matched_index: matched_label_index,
        codeblock_label: command_args.join(" "),
      },
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
        body: {
          command_type: "DiffPartial",
          result_type: "Success",
          message: ` OK: "${textbook_filepath}" のコードブロック "${command_args.join(" ")}" を "${old_sample_file_path}" の ${old_starting_line_num + 1} 行目からに適用すると "${new_sample_file_path}" の ${starting_line_num + 1} 行目からと一致しています`,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: matched_label_index,
        }
      };
    } else {
      return {
        is_success: false,
        body: {
          command_type: "DiffPartial",
          result_type: "Mismatch",
          message: ` MISMATCH FOUND
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
The full diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \`\`\`\n${entire_diff}\`\`\`
The content in the textbook, intended to be the partial diff, is as follows: \n\`\`\`\n${expected_diff}\`\`\` `,
          message_except_content: ` MISMATCH FOUND
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
**************************************`,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: matched_label_index,
          codeblock_label: code_block_label,
          textbook_content: expected_diff,
          sample_content: entire_diff,
        }
      };
    }
  } catch (e) {
    if (e instanceof PatchApplyError) {
      return {
        is_success: false,
        body: {
          command_type: "DiffPartial",
          result_type: "Mismatch",
          message: `  CANNOT APPLY THE PATCH
[original message: \`${e.message}\`]
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"
The full total diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${entire_diff}\`\`\`
The content in the textbook, intended to be the partial diff, is as follows: \n\`\`\`\n${expected_diff}\`\`\` `,
          message_except_content: `  CANNOT APPLY THE PATCH
[original message: \`${e.message}\`]
in ${textbook_filepath}
with the code block labeled "${command_args.join(" ")}"`,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: matched_label_index,
          codeblock_label: code_block_label,
          textbook_content: expected_diff,
          sample_content: entire_diff,
        },
      }
    } else { throw e; }
  }
}




export function run_command_and_get_result(textbook_filepath: string, command: string, matched_file_content: string, config: { src: string }, index:number=-1): TestRes {
  try {
    const command_args = command.trim().split(/\s+/);
    if (command_args[0] === "exact") {
      return handle_exact(textbook_filepath, command_args, matched_file_content, config.src, index);
    } else if (command_args[0] === "diff") {
      return handle_diff(textbook_filepath, command_args, matched_file_content, config.src, index);
    } else if (command_args[0] === "partial") {
      return handle_partial(textbook_filepath, command_args, matched_file_content, config.src, index);
    } else if (command_args[0] === "diff-partial") {
      return handle_diff_partial(textbook_filepath, command_args, matched_file_content, config.src, index);
    } else {
      return {
        is_success: false,
        body: {
          command_type: "Undefined",
          result_type: "UnknownCommand",
          message: ` assert-codeblock は ${JSON.stringify(command)} というコマンドをサポートしていません`,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: index,
          codeblock_label: command,
        }
      };
    }
  } catch (e) {
    if (e instanceof WrongFileNameInCommandError) {
      return {
        is_success: false,
        body: {
          command_type: "Undefined",
          result_type: "WrongFileNameInCommand",
          message: e.message,
          textbook_filepath: textbook_filepath,
          codeblock_matched_index: index,
          codeblock_label: command,
        }
      };
    } else {
      throw e;
    }
  }
}
import fs from "fs";
import { structuredPatch } from 'diff';

function getDiffFromFileNames(oldFileName: string, newFileName: string) {
  const oldStr = fs.readFileSync(oldFileName, { encoding: "utf-8" });
  const newStr = fs.readFileSync(newFileName, { encoding: "utf-8" });
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



export function inspect_codeblock(textbook_filepath: string, config: { src: string }) {
  const textbook_content = fs.readFileSync(textbook_filepath, { encoding: "utf-8" }).replace(/\r?\n/g, "\n");
  const match = [...textbook_content.matchAll(/<!--\s+assert-codeblock\s+(.*?)-->[\n\s]*```(.*?)\n([\s\S]*?)```/gm)]
  if (match.length) {
    console.log(`\n\x1b[34m assert-codeblock: ${textbook_filepath} をチェック中\x1b[0m`);
    match.map(m => m.slice(1)).forEach(
      ([command, file_type, matched_file_content]) => {
        const command_args = command.trim().split(/\s+/);
        if (command_args[0] === "exact") {
          const sample_file_name = command_args[1];
          const sample_file_path = config.src + sample_file_name;
          const sample_file_content = fs.readFileSync(sample_file_path, { encoding: "utf-8" }).replace(/\r?\n/g, "\n");
          if (matched_file_content !== sample_file_content) {
            console.log(`\x1b[33m MISMATCH FOUND 
 in ${textbook_filepath}
 with the code block labeled ${sample_file_name}
Please compare the textbook with the content of ${sample_file_path} \x1b[0m`);
            return false;
          } else {
            console.log(`\x1b[32m OK: "${textbook_filepath}" のコードブロック "exact ${sample_file_name}" は "${sample_file_path}" と一致しています\x1b[0m`);
            return true;
          }
        } else if (command_args[0] === "diff") {
          const old_sample_file_name = command_args[1];
          const new_sample_file_name = command_args[2];
          const old_sample_file_path = config.src + old_sample_file_name;
          const new_sample_file_path = config.src + new_sample_file_name;
          const actual_diff = getDiffFromFileNames(old_sample_file_path, new_sample_file_path);
          // 空行に対しての trailing space でテストが落ちるのはしょうもないので、あらかじめ両者から削っておく
          if (trimEndOnAllLines(matched_file_content) !== trimEndOnAllLines(actual_diff)) {
            console.log(`\x1b[33m MISMATCH FOUND 
 in ${textbook_filepath}
 with the code block labeled "diff ${old_sample_file_name} ${new_sample_file_name}"
 The diff of ${old_sample_file_path} with ${new_sample_file_path} is as follows: \n\`\`\`\n${actual_diff}\`\`\` 
 But the content in the textbook is as follows: \n\`\`\`\n${matched_file_content}\`\`\` 
 \x1b[0m`);
            return false;
          } else {
            console.log(`\x1b[32m OK: "${textbook_filepath}" のコードブロック "diff ${old_sample_file_name} ${new_sample_file_name}" は "${old_sample_file_path}" と "${new_sample_file_path}" の diff と一致しています\x1b[0m`);
            return true;
          }
        } else if (command_args[0] === "partial") {
          const starting_line_num = Number(command_args[2]);
          const sample_file_name = command_args[1];
          const sample_file_path = config.src + sample_file_name;
          const sample_file_content = fs.readFileSync(sample_file_path, { encoding: "utf-8" }).replace(/\r?\n/g, "\n");

          // 末尾の改行を削って行数を数える
          const 行数 = matched_file_content.trimEnd().split("\n").length;

          // 1-index で与えられているので、実際に配列アクセスするときには 1 を引いておく必要がある
          const partial_content = sample_file_content.split("\n").slice(starting_line_num - 1, starting_line_num - 1 + 行数).join("\n");

          // 空行に対しての trailing space でテストが落ちるのはしょうもないので、あらかじめ両者から削っておく
          if (trimEndOnAllLines(partial_content.trimEnd()) !== trimEndOnAllLines(matched_file_content.trimEnd())) {
            console.log(`\x1b[33m MISMATCH FOUND 
 in ${textbook_filepath}
 with the code block labeled "partial ${sample_file_name} ${starting_line_num}"
Please compare the textbook with the content of ${sample_file_path} \x1b[0m`);
            console.log({ partial_content, matched_file_content });
            return false;
          } else {
            console.log(`\x1b[32m OK: "${textbook_filepath}" のコードブロック "partial ${sample_file_name} ${starting_line_num}" は "${sample_file_path}" の ${starting_line_num} 行目からの ${行数} 行と一致しています\x1b[0m`);
            return true;
          }
        } else {
          console.log(`\x1b[33m assert-codeblock は ${JSON.stringify(command)} というコマンドをサポートしていません\x1b[0m`);
          return false;
        }
      }
    );
  }
}

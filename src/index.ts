import fs from "fs";
import os from 'os';
import path from 'path';

import { run_command_and_get_result } from "./command";
import { TestRes } from "./util";
const Enquirer = require('enquirer');

const REGEX_FOR_DETECTING_COMMAND_AND_CODEBLOCK = /<!--\s*assert[-_]codeblock\s+(.*?)-->[\n\s]*(?<code_fence>`{3,}|~{3,})([\w\d -.]*?)\n([\s\S]*?)\k<code_fence>/gm;
const REGEX_FOR_DETECTING_COMMAND = /(<!--\s*assert[-_]codeblock\s+)(.*?)(\s*-->)/gm;

export function inspect_codeblock(textbook_filepath: string, config: { src: string }): boolean {
  let all_success = true;
  const results = inspect_codeblock_and_return_message(textbook_filepath, config);
  for (const { is_success, message, additionally } of results) {
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
  }
  return all_success;
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
      const match = [...textbook_content.matchAll(REGEX_FOR_DETECTING_COMMAND_AND_CODEBLOCK)];
      if (!match.length) return [];

      console.log(`\n\x1b[34m assert-codeblock: ${textbook_filepath} をチェック中\x1b[0m`);
      return match.map(([_, command, code_fence, file_type, matched_file_content]) =>
        run_command_and_get_result(textbook_filepath, command, matched_file_content, config)
      );
    })()];
}

export function run_all_tests(textbook_filepath_arr: string[], config: { src: string }) {
  let count_all = 0;
  let count_success = 0;

  for (const filepath of textbook_filepath_arr) {
    const results = inspect_codeblock_and_return_message(filepath, config);
    for (const { is_success, message, additionally } of results) {
      count_all++;

      if (is_success) {
        count_success++;
        console.log(`\x1b[32m${message}\x1b[0m`);
      } else {
        console.log(`\x1b[31m${message}\x1b[0m`);
      }

      if (additionally) {
        console.log(additionally);
      }
    }
  }

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

export async function rename_src_files(
  textbook_filepath_arr: string[],
  config: { src: string },
  replacements: ReadonlyArray<[string, string]>
) {
  const truly_run = await new Enquirer.Confirm({
    initial: false,
    message: `以下のリネームを実施します。本当によろしいですか？\n\t${replacements.map(([before, after]) => `${before} ==> ${after}`).join("\n\t")}`
  }).run();

  if (!truly_run) {
    return;
  }

  console.log("\x1b[34m assert-codeblock: まず、ファイルを移動します。\x1b[0m");

  const get_tmp_dir = () => fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
  const remove_tmp_dir = (path: string) => fs.rmSync(path, { recursive: true });

  const tmp_dir = get_tmp_dir();

  console.log(" assert-codeblock: 先に、対象ファイルをすべて一時フォルダへと動かします。");
  for (const [before, after] of replacements) {
    console.log(" assert-codeblock: ", `${config.src}${path.sep}${before}`, "==>", `${tmp_dir}${path.sep}${after}`);
    fs.renameSync(`${config.src}${path.sep}${before}`, `${tmp_dir}${path.sep}${after}`);
  }

  console.log(" assert-codeblock: その後で一気に一時フォルダから戻します。");
  fs.readdirSync(tmp_dir).forEach(file_name => {
    console.log(" assert-codeblock: ", `${tmp_dir}${path.sep}${file_name}`, "==>", `${config.src}${path.sep}${file_name}`)
    fs.renameSync(`${tmp_dir}${path.sep}${file_name}`, `${config.src}${path.sep}${file_name}`)
  });

  console.log("\x1b[34m assert-codeblock: ✅ファイルの移動が終わりました。一時フォルダを削除します。\x1b[0m");

  remove_tmp_dir(tmp_dir);

  console.log("\x1b[34m assert-codeblock: ✅一時フォルダを削除しました。教材の方を置き換えていきます。\x1b[0m");
  for (const filepath of textbook_filepath_arr) {
    if (!fs.existsSync(filepath)) {
      return [{
        is_success: false,
        message: ` INCORRECT TEXTBOOK FILEPATH "${filepath}"`
      }];
    }
    const textbook_content = fs.readFileSync(filepath, { encoding: "utf-8" }).replace(/\r?\n/g, "\n");

    const new_content = textbook_content.replaceAll(REGEX_FOR_DETECTING_COMMAND, (_match, before_command, command, after_command) => {
      const command_args = command.split(/\s+/);
      let change_is_made = false;

      function replace(str: string, replacements: ReadonlyArray<[string, string]>) {
        const candidates = replacements.filter(([before, _after]) => before === str);
        if (candidates.length > 1) {
          throw new Error(`assert-codeblock: リネームに失敗しました。\n"${str}" の置き換え先候補が複数（${JSON.stringify(candidates)}）ありま`)
        } else if (candidates.length === 0) {
          return str;
        } else {
          change_is_made = true;
          return candidates[0][1]; // 先頭の after を返す
        }
      }

      if (command_args[0] === "exact" || command_args[0] === "partial") {
        // `assert-codeblock exact ファイル名`
        // `assert-codeblock partial ファイル名 行番号`
        command_args[1] = replace(command_args[1], replacements);
      } else if (command_args[0] === "diff" || command_args[0] === "diff-partial") {
        // `assert-codeblock diff 旧ファイル 新ファイル`
        // `assert-codeblock diff-partial 旧ファイル名 新ファイル 行番号` または `assert-codeblock diff-partial 旧ファイル名 新ファイル 新ファイルの行番号 旧ファイルの行番号` 
        command_args[1] = replace(command_args[1], replacements);
        command_args[2] = replace(command_args[2], replacements);
      } else {
        throw new Error(` assert-codeblock は ${JSON.stringify(command)} というコマンドをサポートしていません`);
      }

      if (change_is_made) {
        console.log(` assert-codeblock: ${filepath} 内でコマンド "${command}" を "${command_args.join(" ")}" に置き換えました。`);
      }
      return `${before_command}${command_args.join(" ")}${after_command}`
    });

    fs.writeFileSync(filepath, new_content);
  }
  console.log("\x1b[34m assert-codeblock: ✅教材内の置き換えを完了しました。\x1b[0m");
}


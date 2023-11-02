import fs from "fs";

import { run_command_and_get_result } from "./command";
import { TestRes } from "./util";

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
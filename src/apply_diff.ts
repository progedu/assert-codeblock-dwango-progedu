export class PatchApplyError extends Error {
  static {
    this.prototype.name = "PatchApplyError";
  }
}


export function apply_diff(oldStr: string, diffStr: string): string {
  const old_str_lines = oldStr.split("\n");
  const diff_lines = diffStr.split("\n");
  return apply_diff_on_lines(old_str_lines, diff_lines).join("\n");
}

/**
 * 
 * @param old_str_lines 
 * @param diff_lines 
 * @param old_starting_line_num patch 適用前の開始行番号 (0-indexed)
 * @returns 
 */
export function apply_diff_on_lines(old_str_lines: string[], diff_lines: string[], old_starting_line_num: number = 0): string[] {
  const ans_lines: string[] = [];
  let i = 0;
  for (let j = old_starting_line_num; j < old_str_lines.length;) {
    if (diff_lines[i] === undefined) { // diff-partial; the diff ran out
      // It seems that there are no more commands to be applied.
      // However, since we might still have some more diffs (that are not listed in this partial diff),
      // we conclude that we know nothing more about the result of applying the full patch.
      // Hence we should immediately exit the function.
      return ans_lines;
    } else if (diff_lines[i] === "") { // intended as an empty line kept as is
      if (old_str_lines[j].trimEnd() !== "") {
        throw new PatchApplyError(`The diff patch (in line ${i + 1}) expects an empty line; got a non-empty line (in line ${j + 1}) \`${old_str_lines[j].trimEnd()}\``);
      }
      ans_lines.push(old_str_lines[j]);
      i++;
      j++;
    } else if (diff_lines[i][0] === " ") { // keep as is
      ans_lines.push(old_str_lines[j]);
      i++;
      j++;
    } else if (diff_lines[i][0] === "-") { // removed row
      // check that the row removed is correct
      if (diff_lines[i].slice(1) !== old_str_lines[j].trimEnd()) {
        throw new PatchApplyError(`The diff patch (in line ${i + 1}) expects the line \`${diff_lines[i].slice(1)}\` to be removed, but the actual line (on line ${j + 1}) is \`${old_str_lines[j]}\``)
      }
      i++;
      j++;
    } else if (diff_lines[i][0] === "+") { // added row
      while (true) {
        if (diff_lines[i] === undefined) {
          // It seems that there are no more commands to be applied.
          // However, since we might still have some more diffs (that are not listed in this partial diff),
          // we conclude that we know nothing more about the result of applying the full patch.
          // Hence we should immediately exit the function.
          return ans_lines;
        }
        if (diff_lines[i][0] !== "+") {
          break;
        }
        ans_lines.push(diff_lines[i].slice(1));
        i++;
      }
    } else {
      throw new PatchApplyError(`(in line ${i + 1}) diff patch started with an unexpected character: \`${diff_lines[i]}\``);
    }
  }
  return ans_lines;
};

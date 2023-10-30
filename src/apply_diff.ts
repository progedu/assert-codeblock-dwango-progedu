export class PatchApplyError extends Error {
  static {
    this.prototype.name = "PatchApplyError";
  }
}


export function apply_diff(oldStr: string, diffStr: string): string {
  const old_str_lines = oldStr.split("\n");
  const diff_lines = diffStr.split("\n");
  const ans_lines: string[] = [];
  let i = 0;
  for (let j = 0; j < old_str_lines.length;) {
    const patch = diff_lines[i];
    if (patch === "") { // intended as an empty line kept as is
      if (old_str_lines[j].trimEnd() !== "") {
        throw new PatchApplyError(`The diff patch (on line ${i}) expects an empty line; got a non-empty line (on line ${j}) \`${old_str_lines[j].trimEnd()}\``);
      }
      ans_lines.push(old_str_lines[j]);
      i++;
      j++;
    } else if (patch[0] === " ") { // keep as is
      ans_lines.push(old_str_lines[j]);
      i++;
      j++;
    } else if (patch[0] === "-") { // removed row
      // check that the row removed is correct
      if (patch.slice(1) !== old_str_lines[j].trimEnd()) {
        throw new PatchApplyError(`The diff patch (on line ${i}) expects the line \`${patch.slice(1)}\` to be removed, but the actual line (on line ${j}) is \`${old_str_lines[j]}\``)
      }
      i++;
      j++;
    } else if (patch[0] === "+") { // added row
      while (diff_lines[i][0] === "+") {
        ans_lines.push(diff_lines[i].slice(1));
        i++;
      }
    } else {
      throw new PatchApplyError("diff patch started with an unexpected character: `" + patch + "`");
    }
  }
  return ans_lines.join("\n");
};

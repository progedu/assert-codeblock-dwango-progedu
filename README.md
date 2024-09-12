# assert-codeblock
コードブロックが「file.xx の全体」「file.xx の一部」「file.xx と file.yy の diff」「file.xx と file.yy の diff の抜粋」として正しいかどうかを自動で検査するツール

## 概要

使い方としては、

1. サンプルファイル用のフォルダを作り、ファイルを入れる
2. 教材中にコメント行を埋め込んでマークする
3. 教材のあるパスとサンプルファイルのパスを assert-codeblock の関数に提供し、テストを走らせる

具体的な使い方は、以下の「マーク方法」と「テスト方法」に書いてある。

**注意：ファイル名にはスペースが入っていないことを前提に全てを組んであります**

また、便利な追加機能として、「リネーム機能」がある。これは、サンプルファイルの名前を変更したくなったときに、関数を一個呼ぶだけで「教材内のコメント行と、サンプルファイル内のコマンド」両方からそのファイル名を検出して置き換えてくれる機能である。

## マーク方法

基本的に、教材の中の「コードブロックを開始するトリプルバッククオート」の前に、<b>一行空行を挟み</b>、その前にコメント行

`<!-- assert-codeblock コマンド名 引数1 引数2 -->`

を入れることでマークする。

空行がないと markdown がコードブロックの開始を認識できない場合があるので、<b>コメント行とコードブロックの間には必ず空行を挟むこと</b>。

### assert-codeblock exact

| 構文 |  `assert-codeblock exact ファイル名` |
|--|--|
| 役割 | 教材に引用されているコードが、サンプルファイルと完全一致するかを調べる |

たとえば、`sample_files/1-1.py` に

```python
def hello():
  print("Hello, World!")

hello()
```

と書いてあるとき、これを教材 `textbook-001.md` にちゃんと引用できているかを調べるためには、`textbook-001.md` に

````markdown
<!-- assert-codeblock exact 1-1.py -->

```python
def hello():
  print("Hello, World!")

hello()
```
````

と書く。

なお、「行末のホワイトスペースが一致していない」は無視して「完全一致」を判定している。

### assert-codeblock diff

| 構文 |  `assert-codeblock diff 旧ファイル 新ファイル` |
|--|--|
| 役割 | 教材に引用されている diff を片方のサンプルファイルに適用したとき、もう片方のサンプルファイルと一致しているかを調べる |


たとえば、`sample_files/1-1.py` に

```python
def hello():
  print("Hello, World!")

hello()
```

とあり、 `sample_files/1-2.py` に

```python
def hello():
  print("Hello, World!")

for x in range(6):
  hello()
```

とあるとき、このふたつのファイルの間の diff を教材 `textbook-002.md` にちゃんと引用できているかを調べるためには、`textbook-002.md` に

````markdown
<!-- assert-codeblock diff 1-1.py 1-2.py -->

```diff-python
 def hello():
   print("Hello, World!")
 
-hello()
+for x in range(6):
+  hello()
```
````

と書く。

### assert-codeblock partial

| 構文 |  `assert-codeblock partial ファイル名 行番号` |
|--|--|
| 役割 | 教材に引用されているコード片が、サンプルファイルの n 行目から正しく引用したものであるかどうか |

たとえば、`sample_files/1-3.py` に

```python
def hello():
  print("Hello, World!")

hello()
print("Hello")
hello()
```

と書いてあるとき、これの 4 行目から始まるコード片を教材 `textbook-003.md` にちゃんと引用できているかを調べるためには、`textbook-003.md` に

````markdown
<!-- assert-codeblock partial 1-1.py 4 -->

```python
hello()
print("Hello")
```
````

と書く。

### assert-codeblock diff-partial

| 構文 |  `assert-codeblock diff-partial 旧ファイル名 新ファイル 行番号` または `assert-codeblock diff-partial 旧ファイル名 新ファイル 新ファイルの行番号 旧ファイルの行番号` |
|--|--|
| 役割 | 教材に n 行目から抜粋されている diff を、片方のサンプルファイルに適用したとき、もう片方のサンプルファイルの m 行目からと一致するか |


たとえば、`sample_files/1-4.py` に

```python
def hello():
  print("Hello, World!")

hello()

def fizz_buzz():
  pass
```

とあり、 `sample_files/1-5.py` に

```python
def hello():
  print("Hello, World!")

for x in range(6):
  hello()

def fizz_buzz():
  for i in range(1, 101):
    if i % 3 == 0 and i % 5 == 0:
        print('FizzBuzz')
    elif i % 3 == 0:
        print('Fizz')
    elif i % 5 == 0:
        print('Buzz')
    else:
        print(i)
```

とあるとき、fizz_buzz 関数のほうの差分だけを教材に引用したいか調べたいときがあるだろう。旧ファイルでは fizz_buzz 関数が 6 行目から始まっており、新ファイルでは 7 行目から始まっていることを考えると、 

教材 `textbook-004.md` には

````markdown
<!-- assert-codeblock diff 1-4.py 1-5.py 7 6 -->

```diff-python
 def fizz_buzz():
-  pass
+  for i in range(1, 101):
+    if i % 3 == 0 and i % 5 == 0:
+        print('FizzBuzz')
+    elif i % 3 == 0:
+        print('Fizz')
+    elif i % 5 == 0:
+        print('Buzz')
+    else:
+        print(i)
```
````

と書く。


## テスト方法

単一のファイルに対して boolean で戻り値を得つつ、コンソールにメッセージも流してほしいときは、こうする。

```js
const AssertCodeblock = require('assert-codeblock-dwango-progedu');
const config = {
  src: "./sample_files/"
};

const textbook_filepath = `textbook-001.md`;
AssertCodeblock.inspect_codeblock(textbook_filepath, config) // true
```

複数のファイルに対して一括でテストを行いつつ、全成功かどうかで終了コードを変えてほしいとき（CI などで便利）は、こうする。

```js
const AssertCodeblock = require('assert-codeblock-dwango-progedu');
AssertCodeblock.run_all_tests_and_exit([
  "textbook-001.md",
  "textbook-002.md",
  "textbook-003.md",
  "textbook-004.md",
  "textbook-005.md"
], { src: "./sample_files/" });
```

一括でテストしてほしいが戻り値が bool で欲しい場合は、代わりに `AssertCodeblock.run_all_tests` を呼ぶこと。

### CI 向けの機能

CI 向けに assert-codeblock の実行結果を改変して表示させたい場合があるかと思う。

その場合は `inspect_codeblock_and_return_message` 関数の戻り値から得られる結果を利用すると良い。

以下に簡単な例として、チェックが失敗した結果について失敗した原因とコードブロックの行数を表示する例を示す。

```js
const { globSync } = require('glob');
const AssertCodeblock = require('assert-codeblock-dwango-progedu');

const config = {
  src: "./_assert_codeblock_test_cases/",
}

const textbook_filepath_arr = globSync('TEXTBOOK*/**.md');

for(const filepath of textbook_filepath_arr) {
  // 指定した教材に対して、assert-codeblockを実行しチェックが失敗した箇所を取得
  const res_arr = AssertCodeblock.inspect_codeblock_and_return_message(filepath, config).filter(res => res.is_success === false);

  for(const res of res_arr) {
    // 取得した結果の中身を取り出して表示
    const body = res.body;
    console.warn(`${body.textbook_filepath}:${body.codeblock_line_num}: ${body.result_type} `)
  }
}
```

この結果、例として以下のような出力が得られる。

```bash
 assert-codeblock: TEXTBOOK/TEXTBOOK.md をチェック中
TEXTBOOK/TEXTBOOK.md:334: Mismatch
TEXTBOOK/TEXTBOOK.md:458: Mismatch
TEXTBOOK/TEXTBOOK.md:1063: Mismatch
TEXTBOOK/TEXTBOOK.md:1477: Mismatch
```

<details>
<summary>戻り値の中身について確認したい場合はここを参照すること</summary>

`inspect_codeblock_and_return_message` は `TestRes` 型で定義されたオブジェクトを返す。

```ts
type TestRes = {
  is_success: Boolean,
  body: ResBody,
  additionally?: unknown
};
```

`is_success` はテストが成功したかどうかを表す。

`additionally` はコードブロックの内容が載っている場合があるが、`body` からでも同様の内容が取得できるためこちらをわざわざ使わなくても大丈夫。`additionally` は将来的に `body` に統合するかもしれない。

`body` はチェック結果の詳細な情報を保ち、`ResBody` 型で定義されたオブジェクトを返す。

```ts
type ResBody = {
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
```

詳細な説明は以下の通り。

| プロパティ | 説明 |
| --- | --- |
| command_type | そのコードブロックで指定されているコマンドのタイプ。e.g `exact`, `diff-partial` ...etc <br> コマンドの指定が意図されないものである場合、`undefined` が返される。 |
| result_type | チェックした結果を取得でき、主にどのようなエラーが吐かれたかを取得するのに使われることを想定している。e.g `Mismatch`,`LineNumMismatch`,`UnknownCommand` |
| message | ローカルで実行する場合に表示する用のメッセージです。CI 用途ではあまり出番はなさそうです。 |
| textbook_filepath | コードブロックが存在する教材のファイルパスです。 |
| codeblock_line_num | チェックしているコードブロックが存在する行数です。 |
| message_except_content | メッセージからコードブロックの内容を省いたものです。簡易的にエラー内容を表示させる場合に使えると思います。 |
| codeblock_label | assert-codeblock のラベルです。どのようなラベルに対してチェックをしたのかわかります。 |
| textbook_content | 教材側のコードブロックの内容です |
| sample_content | サンプルファイル側の内容です。この結果を利用すると textbook_content と合わせて何かできるかもしれません。 |
| textbook_topnum | 教材側のコードブロックで指定した行数です。 |
| sample_topnum | サンプルファイルに対する行数指定を取得します。 |

#### command_type について

コマンドのタイプは先に述べた使い方のところで言及したものと同様です。追加で意図されないコマンドが指定された場合に返される `Undefined` があります。

- Exact
- Diff
- Partial
- DiffPartial
- Undefined

#### result_type について

結果のタイプは主にエラーの種類を示すものです。以下にその一覧を示します。

| 種類 | 内容 |
| --- | --- |
| Success | チェックが成功 |
| Mismatch | コードブロックの内容が一致しない |
| TextbookNotFound | 指定されたパスに教材が存在しない |
| WrongFileNameInCommand | 指定したサンプルファイル名が間違っている |
| LineNumMismatch | 指定された行数において記述が食い違っている |
| LineNumMissing | 行数指定が存在しない |
| LineNumNotNumber | 行数指定が数値ではない |
| UnknownCommand | 意図されないコマンドが入力された場合に返される |
| UnknownError | 上記の結果以外がこれで返される |

</details>

## リネーム機能

こうする。

A → B → C → A といったリネームにも対応している。

```js
const AssertCodeblock = require('assert-codeblock-dwango-progedu');
AssertCodeblock.rename_src_files([
  "textbook-001.md",
  "textbook-002.md",
  "textbook-003.md",
  "textbook-004.md",
  "textbook-005.md"
], { src: "./sample_files/" }, [
  [ "1-1.py", "1-1-hello-world.py" ],
  [ "1-2.py", "1-2-fizz_buzz.py" ],
  [ "1-3.py", "1-3-fibonacci.py" ],
  [ "1-4.py", "1-5.py" ], // こういう
  [ "1-5.py", "1-6.py" ], // トリッキーな
  [ "1-6.py", "1-4.py" ], // 入れ替えにも対応
]);
```

## その他

このスクリプトになんらかのバグがあったら、是非このリポジトリに issue を上げていただきたい。

なお、このスクリプトは正規表現 `<!--\s*assert[-_]codeblock\s+` にマッチするコメントだけに対して検査を行うので、そういう場合は `<!-- FIXME: assert-codeblock` などとすると黙殺できる。


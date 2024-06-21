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

### assert-codeblock upd-exact

| 構文 |  `assert-codeblock upd-exact 新ファイル名` |
|--|--|
| 役割 | ローカル実行時は、教材に引用されているコードで新ファイルを置き換える。<br>github-action 実行時は exact として動作する|

たとえば、`sample_files/2-1.py` を

```python
def hello():
  print("Hello, World!")

hello()
```

としたいときは、

````markdown
<!-- assert-codeblock upd-exact 2-1.py -->

```python
def hello():
  print("Hello, World!")

hello()
```
````

と書く。

なお、upd-exact をローカル実行した場合は、置き換え処理だけが行われ検査は実行されない。
対して、github-actionsで実行した場合は、exactとして起動するため完全一致を検査し、ファイルの置き換えは実行されない。

### assert-codeblock upd-diff

| 構文 |  `assert-codeblock upd-diff 旧ファイル 新ファイル` |
|--|--|
| 役割 | ローカル実行時は、教材に引用されている diff 適用前のコードが旧ファイルと一致するかを検査する。問題なければ新ファイルに diff 適用後のファイルを書き出す。<br>github-action 実行時は diff として動作する |

たとえば、`sample_files/2-1.py` に

```python
def hello():
  print("Hello, World!")

hello()
```

とあるとき、

````markdown
<!-- assert-codeblock upd-diff 2-1.py 2-2.py -->

```diff-python
 def hello():
   print("Hello, World!")
 
-hello()
+for x in range(6):
+  hello()
```
````

と書く。

検査が問題なければ、`sample_files/2-2.py` は以下の内容で更新される。

```python
def hello():
  print("Hello, World!")

for x in range(6):
  hello()
```

なお、github-actions で実行した場合は、diff として起動するため、ファイルの置き換えは実行されない。

### assert-codeblock upd-partial

| 構文 |  `assert-codeblock partial 旧ファイル 新ファイル 行番号` |
|--|--|
| 役割 | 教材に引用されているコードを、旧ファイルの n 行目から適用して、新ファイルを書き出す。<br> github-action 実行時は、partial 新ファイル 行番号として起動する|

たとえば、`sample_files/2-2.py` に

```python
def hello():
  print("Hello, World!")

for x in range(6):
  hello()
```

と書いてあるとき、これの 7 行目から新たにコードを追加したい場合

````markdown
<!-- assert-codeblock upd-partial 2-2.py 2-3.py 6 -->

```python
print("Hello")
```
````

と書く。

適用できれば、`sample_files/2-3.py` は以下の内容で更新される。

```python
def hello():
  print("Hello, World!")

for x in range(6):
  hello()

print("Hello")
```

なお、このコマンドは、通常のコードブロックを使って、コード追加する指示をしているときに使うことを想定している。<br>
コード解説のような、更新を指示しないものについては、partial や exact を利用する。

他のコマンド同様に、github-actions で実行した場合は、partial として起動するため、ファイルの置き換えは実行されない。

### assert-codeblock upd-diff-partial

| 構文 |  `assert-codeblock upd-diff-partial 旧ファイル名 新ファイル 行番号` |
|--|--|
| 役割 | ローカル実行時は、教材に n 行目から抜粋されている diff 適用前のコードが旧ファイルと一致するかを検査する。問題なければ新ファイルに diff 適用後のファイルを書き出す。<br>github-action 実行時は diff-partial として動作する |

たとえば、`sample_files/2-3.py` に

```python
def hello():
  print("Hello, World!")

for x in range(6):
  hello()

print("Hello")
```

とあり、2行目から引用して、差分更新をしたい場合

````markdown
<!-- assert-codeblock upd-diff-partial 2-3.py 2-4.py 2 -->

```diff-python
   print("Hello, World!")

-for x in range(6):
+for x in range(5):
   hello()
```

````

と書く。

なお、github-actions で実行した場合は、diff-partial として起動するため、ファイルの置き換えは実行されない。

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


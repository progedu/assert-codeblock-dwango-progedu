# assert-codeblock
コードブロックが「file.xx の全体」「file.xx の一部」「file.xx と file.yy の diff」と一致しているかどうかを自動で検査するツール

使い方としては、

1. サンプルファイル用のフォルダを作り、ファイルを入れる
2. 教材中にコメント行を埋め込んでマークする
3. 教材のあるパスとサンプルファイルのパスを assert-codeblock の関数に提供し、テストを走らせる

具体的な使い方は、以下の「マーク方法」と「テスト方法」に書いてある。

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
const config = {
  src: "./sample_files/"
};

const textbook_filepath_arr = [];
for (let 節 = 1; 節 <= 24; 節++) {
  const name = `ABIKZZ05_G${節.toString().padStart(3, '0')}`;
  const textbook_filepath = `./${name}/${name}.md`;
  textbook_filepath_arr.push(textbook_filepath);
}

AssertCodeblock.run_all_tests_and_exit(textbook_filepath_arr, config);
```

一括でテストしてほしいが戻り値が bool で欲しい場合は、 `AssertCodeblock.run_all_tests` を呼ぶこと。

## その他

このスクリプトになんらかのバグがあったら、是非このリポジトリに issue を上げていただきたい。

なお、このスクリプトは正規表現 `<!--\s*assert[-_]codeblock\s+` にマッチするコメントだけに対して検査を行うので、そういう場合は `<!-- FIXME: assert-codeblock` などとすると黙殺できる。


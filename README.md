# assert-codeblock
コードブロックが「file.xx の全体」「file.xx の一部」「file.xx と file.yy の diff」と一致しているかどうかを自動で検査するツール

## 使い方

### assert-codeblock exact: 教材に引用されているコードが、サンプルファイルと完全一致するかを調べる

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

と書く。そして、

```js
const AssertCodeblock = require('assert-codeblock-dwango-progedu');
const config = {
  src: "./sample_files/"
};

const textbook_filepath = `textbook-001.md`;
AssertCodeblock.inspect_codeblock(textbook_filepath, config) // true
```

を走らせると、メッセージが出力される。現状、返り値は boolean で来る。

なお、「行末のホワイトスペースが一致していない」は無視して「完全一致」を判定している。

### assert-codeblock diff: 教材に引用されている diff が、サンプルファイル間の diff と一致しているか

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

と書く。そして、

```js
const AssertCodeblock = require('assert-codeblock-dwango-progedu');
const config = {
  src: "./sample_files/"
};

const textbook_filepath = `textbook-002.md`;
AssertCodeblock.inspect_codeblock(textbook_filepath, config) // true
```

を走らせると、メッセージが出力される。現状、返り値は boolean で来る。

### assert-codeblock partial: 教材に引用されているコード片が、サンプルファイルの n 行目から正しく引用したものであるかどうか

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

と書く。そして、

```js
const AssertCodeblock = require('assert-codeblock-dwango-progedu');
const config = {
  src: "./sample_files/"
};

const textbook_filepath = `textbook-003.md`;
AssertCodeblock.inspect_codeblock(textbook_filepath, config) // true
```

を走らせると、メッセージが出力される。現状、返り値は boolean で来る。

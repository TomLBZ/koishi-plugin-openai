# @tomlbz/koishi-plugin-openai 简介
***本插件用于`聊天用`机器人，`而非`功能性机器人。为 `Koishi.js` 调用 `OpenAI` 的语言模型。暂无`本地化`支持。***

[![npm](https://img.shields.io/npm/v/@tomlbz/koishi-plugin-openai?style=flat-square)](https://www.npmjs.com/package/@tomlbz/koishi-plugin-openai)

### 欢迎使用*★,°*:.☆(￣▽￣)/$:*.°★* 
1. [更新日志](#ver-200-更新日志)
2. [可能的问题](#你也需要问)
3. [配置参考](#配置参考)
4. [与ChatGPT对比](#与chatgpt对比)

# Ver 2.0.2 更新日志
1. 新增：支持`gpt-3.5-turbo`模型，并将`turbo`系列模型与其他系列模型的调用方式进行了统一。
2. 新增：允许在`插件配置-全局设置-基础设置-nickname`中增加任意数量的`昵称`用于触发AI回复。
3. 新增：添加消息`冷却时间`，防止API调用过于频繁导致出错（API返回一般需要几秒钟）。
4. 新增：允许在群组中直接`回复/引用`机器人的消息触发AI回复。
5. 新增：支持使用`pinecone`向量数据库（可以[免费注册](https://www.pinecone.io/)）存储`长期记忆`，大大提升了记忆范围。（未启用时仅在本地存储短期记忆）
6. 新增：基于`pinecone`的`关联检索`功能，可以更准确地从听过的话中获取信息。
7. 新增：提供`WolframAlpha推理模块`来尽可能计算参考答案（可以[免费申请AppID](https://products.wolframalpha.com/api)），可以更好地回答如“`3^99等于几`”、“`sin(x^2)的积分是什么`”、“`一加仑等于多少毫升`”这类问题。需要提供`Bing翻译API`（[免费注册](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator/)）。不填则调用`Google`（`非API`，有调用次数限制）。如果两者都不可用，推理模块就只对英语有反应了( ╯□╰ )2333
8. 新增：利用`Bing`搜索API（可以[免费注册](https://www.microsoft.com/en-us/bing/apis/pricing)）和`google`搜索（`非API`，可能被限制）和实现`检索模块`，对回答中的`常识性无知`进行规避（可以更好地回答如“`今天星期几`”、“`现在几点了`”这类问题）。
9. 新增：可以让机器人在群聊中发言回复消息的时候`@发送者`（可选）。
10. 改进：简化了模型配置项，加载插件时自动选择一类模型中的`最新版`（如选择`turbo`则自动应用`gpt-3.5-turbo`）。
11. 改进：重构了`记忆`的储存方式，使用`Embeddings`和`文本`形式分别储存`长期记忆`和`短期记忆`，提升了`记忆检索`的效率。
12. 改进：加长了`max_token`的最大值，以适应更长的回复。（仍然不建议很长，因为`整个`会话一共`4000 token`，各种需要例子的`prompt engineering`以及对话历史占用大量`token`数）
13. 修复：修复了有时候`直呼其名`时机器人`无法回复`的问题。
14. 修复：移除了对`openai`、`pinecone`等库的依赖，全面换用`ctx.http.post/get`等`koishi`的API，以便解决代理问题。

# 你也许要问：
### 关于“为什么挂了代理一直报错？”
1. 答：因为你没有配置好代理。详见这个[友情文档](https://github.com/yi03/koishi-plugin-openai-api#%E4%BB%A3%E7%90%86%E9%85%8D%E7%BD%AE)（感谢[@yi03](https://github.com/yi03)），可以帮你设置好代理。
   1. 代理有问题的话你的错误信息很可能包含`connect ETIMEDOUT`、`handleRequestError`之类字样。

### 关于“为什么某个功能好像没用？”
1. 答：因为你没有正确配置相关的功能。详见[配置参考](#配置参考)。
   1. 比如，如果你的机器人不能准确计算数学问题，原因是你没有配置好[机器人知识配置](#机器人知识配置)，导致`计算推理`功能自动禁用。
   2. 再比如，如果你的机器人无法有效地联想关键词，原因是你没有配置好[机器人记忆配置](#机器人记忆配置)，导致`长期记忆`功能自动禁用。

### 关于“为什么实现了这个功能而不是那个功能？”
1. 为什么不用`百度API`？
   - 因为开发者在国外根本`无法登录百度API平台`，只能申请个寂寞。况且免费的百度搜索经常导致`Prohibited IP`，所以百度的代码写了一半，就搁置了……(((m -__-)m……
2. 那为什么不干脆用`Google API`？
   - 因为不少用户在国内，需要考虑一种`国内国外都可以使用`的API，于是只能`Bing`了……不填API Key的话还会尝试调用`Google`，然而`并非API`所以有可能`受限`或`被墙`导致失败。...┏┛墓┗┓...
3. 为什么长时间没更新？
   - 开发者`太蔡`了，而且最近忙着搞毕设，没什么时间写代码……///（つ﹏⊂）///……

### 关于产生 AI 回复的几种情况
1. ta 被`直接呼叫`了（`@名字`，或`回复/引用`其消息，或者聊天时`直呼其名`）
1. ta 正在和你`私聊`
1. 你取得了 ta 的`随机注意`

### 关于回复比较奇怪的情况
1. 插件刚刚开始运行时，机器人的记忆有大量空白，因此表现具有`可塑性`。经过一段时间、一定量的对话以后，随着记忆逐渐成型，机器人的说话方式也逐渐`定型`。因此建议机器人`刚刚建立`的时候`走心地`和`ta`说话，因为你最初和`ta`说的话决定了`ta`是个什么样的机器人。
2. 机器人的`人设`和`示例对话`大有讲究，可以多试试。
3. 如果回复巨慢无比，是因为你的`网络环境`不怎么好。无力了……

# 配置参考
## OpenAI 配置
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| apiKey | 调用OpenAI API | - | 填写你的OpenAI API Key |
| chatModel | 选择`语言模型` | `turbo`<br>`davinci`<br>`babbage`<br>`curie`<br>`ada` | `turbo`是效果最好的 |
| codeModel | 选择`代码模型` | `davinci`<br>`cushman` | `davinci`是效果最好的 |
## 机器人身份配置
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| botName | 机器人的`名字` | - | 不要太长 |
| isNickname | 是否允许全局设置中的`昵称`触发AI回复 | `true`<br>`false` | `true` |
| botIdentity | 机器人`人设`的重要组成部分 | - | 提到名字请用`<NAME>`代替。建议不超过`200`字 |
| sampleDialog | 机器人`初始说话习惯`的主要组成部分 | - | 维持`自洽`，且`不要太多/太长`，否则容易消耗大量`token`。建议`5`条以内，每条`20`字左右 |
## 机器人记忆配置
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| cacheSize | 机器人`短期记忆`的容量/`条` | `2~32` | 根据回答长度酌情调整，固定占用`token`数为`条数`x`每条的token数` |
| cacheSaveInterval | 机器人`短期记忆`的`保存间隔` | `>=1` | 单位`条`，建议每隔`4~8`条保存一次 |
| cacheSaveDir | 机器人`短期记忆`的`保存路径` | - | 是`koishi`根目录开始的`相对目录`。建议保留默认的`'cache'` |
| pineconeKey | `pinecone`数据库的`API密钥`，填写后启动`长期记忆`、`联想搜索`等功能 | - | 填写你自己的API密钥 |
| pineconeReg | `pinecone`数据库的地区，形如`us-east1-gcp` | - | 填写你自己的数据库实例的地区 |
| pineconeIndex | `pinecone`数据库的索引名 | - | 填写你自己的数据库实例的索引名 |
| pineconeNamespace | `pinecone`数据库的`命名空间` | - | 填写你自己的命名空间，或保留默认的`'koishi'` |
| pineconeTopK | `pinecone`数据库的`最大返回条数` | `1~3` | 建议`2`，提高则快速消耗`token`数且会让AI`分心` |
## 机器人知识配置
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| wolframAppId | `wolfram`的`appid`，用于计算 | - | 填写你自己的appid |
| azureTranslateKey | `Bing`翻译`API`的`密钥`，用于为`wolfram`提供翻译。不填则调用`google`翻译。如果二者均不可用，wolfram知识引擎将被禁用 | - | 填写你自己的API密钥 |
| azureTranslateRegion | `Bing`翻译`API`的地区，形如`eastasia` | - | 填写你自己的`API`地区，默认是`global` |
| searchTopK | `搜索模块`的`最大条数`，用于提升知识广度 | `1~3` | 建议`1`，提高则快速消耗`调用次数`且会让AI`分心` |
| azureSearchKey | `Bing`搜索`API`的`密钥`，用于为`搜索模块`提供搜索 | - | 填写你自己的API密钥 |
| azureSearchRegion | `Bing`搜索`API`的地区，形如`eastasia` | - | 填写你自己的`API`地区，默认是`global` |
## 机器人回复配置
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| isReplyWithAt | 是否在回复消息时`@`发送者，仅用于群聊 | `true`<br>`false` | `false` |
| msgCooldown | 消息`冷却时间`/`秒`，在此期间机器人不会响应消息 | `1~3600` | 根据网络情况酌情调整，使得API总在下次调用之前返回 |
| nTokens | 机器人回复的`最大长度` | `16~512` | 必须是`16`的整数倍，建议`128~256`之间。提高则快速消耗`token`数 |
| temperature | 回复温度，越小越固定，`越大越随机` | `0~1` | 建议`0.7~1`之间 |
| presencePenalty | 越大越会避免`出现过`的token，和出现`次数无关` | `-2~2` | 建议`0`左右 |
| frequencyPenalty | 越大越会避免`频繁出现`的token，出现次数`越多`越受该参数影响 | `-2~2` | 建议`0`左右 |
| randomReplyFrequency | `随机`对某句话产生兴趣并`回复`的概率 | `0~1` | 不要太高，否则万一被刷屏容易消耗大量token。建议`0.1~0.3`之间 |
## 调试配置
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| isLog | 向控制台输出日志信息 | `true`<br>`false` | 建议`true`，有助于了解运行状态 |
| isDebug | 向控制台输出调试信息 | `true`<br>`false` | 建议`false`，否则会大大增加日志长度 |

# 与ChatGPT对比
| ChatGPT | @tomlbz/koishi-plugin-openai |
| --- | --- |
| ![](img/ChatGPT_01.jpg) | ![](img/Console_01.jpg)<br>![](img/Yuumu_01.jpg) |
| ![](img/ChatGPT_02.jpg) | ![](img/Console_02.jpg)<br>![](img/Yuumu_02.jpg) |
| ![](img/ChatGPT_03.jpg) | ![](img/Console_03.jpg)<br>![](img/Yuumu_03.jpg) |
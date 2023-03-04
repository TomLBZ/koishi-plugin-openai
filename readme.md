# @tomlbz/koishi-plugin-openai 简介
***本插件用于`聊天用`机器人，`而非`功能性机器人。暂无`本地化`支持。***

[![npm](https://img.shields.io/npm/v/@tomlbz/koishi-plugin-openai?style=flat-square)](https://www.npmjs.com/package/@tomlbz/koishi-plugin-openai)

欢迎使用*★,°*:.☆(￣▽￣)/$:*.°★* 

# Ver 2.0.0 更新日志
1. 新增：支持`gpt-3.5-turbo`模型，并将`turbo`系列模型与其他系列模型的调用方式进行了统一。
2. 新增：允许在`插件配置-全局设置-基础设置-nickname`中增加任意数量的`昵称`用于触发AI回复。
3. 新增：允许在群组中直接`回复/引用`机器人的消息触发AI回复。
4. 新增：支持使用`pinecone`向量数据库存储`长期记忆`，大大提升了记忆范围。（未启用时仅在本地存储短期记忆）
5. 新增：基于`pinecone`的`关联检索`功能，可以更准确地从听过的话中获取信息。
6. 改进：简化了模型配置项，加载插件时自动选择一类模型中的`最新版`（如选择`turbo`则自动应用`gpt-3.5-turbo`）。
8. 改进：重构了`记忆`的储存方式，使用`Embeddings`和`文本`形式分别储存`长期记忆`和`短期记忆`，提升了`记忆检索`的效率。
7. 改进：加长了`max_token`的最大值，以适应更长的回复。（仍然不建议很长，因为`整个`会话一共`4000 token`，各种需要例子的`prompt engineering`以及对话历史占用大量`token`数）
8.  新增：`检索模块`，对回答中的`常识性无知`进行规避（可以更好地回答如“今天星期几”、“现在几点了”这类问题）。--进行中！
9.  新增：`计算模块`，对回答中的`困难数学计算`进行验证（可以更好地回答如“3^99*4^88等于几”、“sin(x^2)/tan(x)log(x)的积分怎么算”这类问题）。--进行中！
10. 新增：`代码模块`，对部分`代码`进行验证（可以更好地回答如“这段代码报什么错”、“这段代码的输出是什么”这类问题）。--进行中！

# 产生 AI 回复的几种情况
为 `Koishi.js` 调用 `OpenAI` 的语言模型。
机器人会在以下几种情况使用 `OpenAI API` 返回回复：
1. ta 被`直接呼叫`了（`@名字`，或`回复/引用`其消息，或者聊天时`直呼其名`）
1. ta 正在和你`私聊`
1. 你取得了 ta 的`随机注意`

# 注意事项
插件刚刚开始运行时，机器人的**记忆有大量空白**，因此表现具有**可塑性**。经过一段时间、一定量的对话以后，随着**记忆逐渐成型**，机器人的说话方式也**逐渐定型**。因此建议机器人**刚刚建立**的时候**认真地**和ta说话，因为你最初**和 ta 说的话**决定了 ta 是个什么样的机器人。

# 配置参考
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| apiKey | 调用OpenAI API | - | 填写你的OpenAI API Key |
| chatModel | 选择`语言模型` | `turbo`<br>`davinci`<br>`babbage`<br>`curie`<br>`ada` | `turbo`是效果最好的 |
| codeModel | 选择`代码模型` | `davinci`<br>`cushman` | `davinci`是效果最好的 |
| botName | 机器人的`名字` | - | 不要太长 |
| isNickname | 是否允许全局设置中的`昵称`触发AI回复 | `true`<br>`false` | `true` |
| botIdentity | 机器人`人设`的重要组成部分 | - | 用`你是...`开头，建议不超过`100`字 |
| sampleDialog | 机器人`初始说话习惯`的主要组成部分 | - | 维持`自洽`，且`不要太多/太长`，否则容易消耗大量`token`。建议`5`条以内，每条`20`字左右 |
| cacheSize | 机器人`短期记忆`的容量/`条` | `2~32` | 根据回答长度酌情调整，固定占用`token`数为`条数`x`每条的token数` |
| cacheSaveInterval | 机器人`短期记忆`的`保存间隔` | `>=1` | 单位`条`，建议每隔`4~8`条保存一次 |
| cacheSaveDir | 机器人`短期记忆`的`保存路径` | - | 是`koishi`根目录开始的`相对目录`。建议保留默认的`'cache'` |
| pineconeEnabled | 是否启用基于`Pinecone`的`长期记忆` | `true`<br>`false` | 推荐`true`，可以极大改善机器人的表现，除非你的网络环境连不上Pinecone。 |
| pineconeReg | `pinecone`数据库的地区，形如`us-east1-gcp` | - | 填写你自己的数据库实例的地区 |
| pineconeIndex | `pinecone`数据库的索引名 | - | 填写你自己的数据库实例的索引名 |
| pineconeKey | `pinecone`数据库的`API密钥` | - | 填写你自己的API密钥 |
| pineconeNamespace | `pinecone`数据库的`命名空间` | - | 填写你自己的命名空间，或保留默认的`'koishi'` |
| pineconeTopK | `pinecone`数据库的`最大返回条数` | `1~5` | 建议`1~3`，提高则快速消耗`token`数 |
| wolframAddress | `wolfram`的`API地址`，用于计算 | - | 填写你自己的API地址 |
| wolframAppId | `wolfram`的`appid`，用于计算 | - | 填写你自己的appid |
| nTokens | 机器人回复的`最大长度` | `16~512` | 必须是`16`的整数倍，建议`128`左右。提高则快速消耗`token`数 |
| temperature | 回复温度，越小越固定，`越大越随机` | `0~1` | 建议`0.7~1`之间 |
| presencePenalty | 越大越会避免`出现过`的token，和出现`次数无关` | `-2~2` | 建议`0`左右 |
| frequencyPenalty | 越大越会避免`频繁出现`的token，出现次数`越多`越受该参数影响 | `-2~2` | 建议`0`左右 |
| randomReplyFrequency | `随机`对某句话产生兴趣并`回复`的概率 | `0~1` | 不要太高，否则万一被刷屏容易消耗大量token。建议`0.1~0.3`之间 |
| isLog | 向控制台输出调试信息 | `true`<br>`false` | 建议`false`，否则会大大增加log的长度 |
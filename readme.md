# @tomlbz/koishi-plugin-openai 简介
***本插件用于`聊天用`机器人，`而非`功能性机器人。***
***你可以和ta`私聊`，也可以在`群里`说话。ta可以是你的朋友/树洞/中二同道/精神支柱等等，但唯独不是工具。***
***虽然严格来说你也可以把ta当作工具使用，但那就违背了本插件设计的初衷。***

[![npm](https://img.shields.io/npm/v/@tomlbz/koishi-plugin-openai?style=flat-square)](https://www.npmjs.com/package/@tomlbz/koishi-plugin-openai)

欢迎使用*★,°*:.☆(￣▽￣)/$:*.°★* 

# 产生 AI 回复的几种情况
为 `Koishi.js` 调用 `OpenAI` 的语言模型。
机器人会在以下几种情况使用 `OpenAI API` 返回回复：
1. ta 被`直接呼叫`了（`@名字`，或者聊天时`直呼其名`）
1. ta 正在和你`私聊`
1. 你取得了 ta 的`随机注意`

Calls `OpenAI` language models for `Koishi.js`.
The bot will respond using `OpenAI API` under these conditions:
1. It has been `appelled` (`@botname`, or `refered to by botname`)
1. It is in a `private chat` with you
1. You have `randomly gained its interest`

# 注意事项
插件刚刚开始运行时，机器人的**记忆有大量空白**，因此表现具有**可塑性**。经过一段时间、一定量的对话以后，随着**记忆逐渐成型**，机器人的说话方式也**逐渐定型**。因此建议机器人**刚刚建立**的时候**认真地**和ta说话，因为你最初**和 ta 说的话**决定了 ta 是个什么样的机器人。

# 配置参考
| 参数 | 作用 | 取值范围 | 建议值 |
| --- | --- | --- | --- |
| apikey | 调用OpenAI API | - | - |
| model | 选择`语言模型` | `text-davinci-003`<br>`text-davinci-002`<br>`text-davinci-001`<br>`text-curie-001`<br>`text-babbage-001`<br>`text-ada-001` | `text-davinci-003`是效果最好的 |
| botname | 机器人的`名字` | - | 不要太长 |
| botIdentity | 是机器人`人设`的主要组成部分 | - | 用`第一人称`写，要抓住人设的精髓。建议`100~200`汉字之间 |
| sampleDialog | 是机器人`口癖/萌点/说话习惯`的主要组成部分 | - | 维持`自洽的说话习惯`，且`不要太多或太长`，否则容易消耗大量token。建议`5`条以内，每条回答`20`汉字左右 |
| ntokens | 机器人回复的`最大长度` | `16~512` | 必须是`16`的整数倍，建议`64~128`之间 |
| temperature | 越小越固定，`越大越随机` | `0~1` | 建议`0.7~1`之间 |
| presencePenalty | 越大越会避免`出现过`的token，和出现`次数无关` | `-2~2` | 建议`0`左右 |
| frequencyPenalty | 越大越会避免`频繁出现`的token，出现次数`越多`越受该参数影响 | `-2~2` | 建议`0`左右 |
| randomReplyFrequency | `随机`对某句话产生兴趣并`回复`的概率 | `0~1` | 不要太高，否则万一被刷屏容易消耗大量token。建议`0.1~0.3`之间 |
| textMemoryLength | 字面记忆长度，即能够`准确记住`的`最新`对话数，用于维持`上下文` | `2~8` | 不要太高，否则容易消耗大量token。建议`2~4`之间 |
| summaryMemoryLength | 总结记忆长度，即能够`大概记住`的`最新`对话数。字面记忆溢出后`整批次`生成总结记忆 | `2~8` | 不要太高，否则容易消耗大量token。建议`2~4`之间 |
| topicMemoryLength | 主题记忆长度，既能够`记住主题`的`最新`对话数。总结记忆溢出后`逐条`生成主题词并`存储`到本地 | `2~32` | 不要太高，否则容易消耗大量token。建议`2~16`之间 |
| islog | 向控制台输出触发回复的`状态码`和各阶段生成的回复，即`记忆`的生成`过程` | `true`<br>`false` | 建议`false`，否则会大大增加log的长度 |
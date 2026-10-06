// Codex 更新入口：修改内容后递增 version，再运行 npm run check 与 npm test。
// 所有内容是待确认学习起点的试学样例，不预设孩子已经掌握哪些知识。
const choice = (prompt, options, answer, hint, solution, art = null) => ({ type: 'choice', prompt, options, answer, hint, solution, art });
const number = (prompt, answer, hint, solution, art = null) => ({ type: 'number', prompt, answer: String(answer), hint, solution, art });
export const content = {
  version: '2026.10.06.5',
  publishedAt: '2026-10-06',
  students: {
    cc: { name: '橙橙', stage: '初一 · 概念与联系', intro: '从一个为什么，走向下一扇门。', startNode: 'cc-number-line' },
    tt: { name: '甜甜', stage: '幼小衔接 · 数感与发现', intro: '看一看，想一想，发现一点新东西。', startNode: 'tt-groups' }
  },
  nodes: [
    {
      id:'cc-number-line', student:'cc', title:'数轴上的位置', summary:'在数轴上，越靠右的数越大。', domain:'数与代数', prerequisites:[], related:['cc-negative','cc-distance'],
      example:'−3 和 −5 都在 0 的左边，但 −3 更靠右，所以 −3 > −5。', curiosity:'数轴上两个点之间，还能找到多少个数？', art:{type:'line',points:[-5,-3,0,3]},
      questions:[
        choice('−3 和 −5，哪个数更大？',['−3','−5','一样大'],'−3','想象它们在数轴上的位置。','−3 在 −5 的右边，所以 −3 更大。', {type:'line',points:[-5,-3,0]}),
        choice('一个点从 −2 向右走 3 格，到哪里？',['−5','1','−1'],'1','向右走，每走一格数就增加 1。','从 −2 出发：−1、0、1，所以到 1。'),
        choice('0 在数轴上表示什么？',['最大的数','正数与负数的分界位置','最小的数'],'正数与负数的分界位置','看看 0 左右的数。','0 的右边是正数，左边是负数；0 本身既不是正数，也不是负数。')
      ]
    },
    {
      id:'cc-negative',student:'cc',title:'负数与生活',summary:'正负号可以表示相反方向或相反意义的量。',domain:'生活数学',prerequisites:[],related:['cc-number-line','cc-addition'],
      example:'把地面记为 0 米，地面以下 3 米可以记为 −3 米。',curiosity:'零下 3℃ 的“零”，和地下 3 米的“零”，各代表什么？',art:{type:'line',points:[-3,0,3]},
      questions:[
        choice('把收入记为正数，支出 12 元应记为？',['+12 元','−12 元','0 元'],'−12 元','收入和支出是相反意义。','收入为正时，支出为负，所以记为 −12 元。'),
        choice('气温从 −4℃ 升到 2℃，升高了多少？',['2℃','4℃','6℃'],'6℃','先从 −4℃ 到 0℃，再从 0℃ 到 2℃。','到 0℃ 升高 4℃，再升高 2℃，共 6℃。'),
        choice('规定向东为正，向西走 5 米怎样表示？',['+5 米','−5 米','不能表示'],'−5 米','向西与规定的正方向相反。','向东为正，向西为负，因此是 −5 米。')
      ]
    },
    {
      id:'cc-distance',student:'cc',title:'绝对值：到零的距离',summary:'一个数的绝对值，是它在数轴上到 0 的距离。',domain:'数与代数',prerequisites:['cc-number-line'],related:['cc-negative','cc-opposite'],
      example:'−4 和 4 到 0 都有 4 格，所以它们的绝对值都是 4。',curiosity:'到 0 的距离相同的两个点，一定表示同一个数吗？',art:{type:'line',points:[-4,0,4]},
      questions:[
        number('−7 的绝对值是多少？',7,'距离不带方向。','−7 到 0 的距离是 7，所以 |−7| = 7。'),
        choice('绝对值等于 3 的数有哪些？',['只有 3','只有 −3','3 和 −3'],'3 和 −3','在 0 的两边各找一个距离为 3 的点。','3 和 −3 到 0 的距离都是 3。'),
        choice('“绝对值越大，数就越大”总成立吗？',['总成立','不总成立'],'不总成立','比较 −8 和 −2。','|−8| > |−2|，但 −8 < −2，所以不总成立。')
      ]
    },
    {
      id:'cc-opposite',student:'cc',title:'相反数：镜子另一边',summary:'相反数在数轴上位于 0 的两侧，到 0 的距离相同；0 的相反数是 0。',domain:'数与代数',prerequisites:['cc-number-line'],related:['cc-distance','cc-addition'],
      example:'5 的相反数是 −5；−5 的相反数是 5。',curiosity:'为什么 0 的相反数还是 0？',art:{type:'line',points:[-5,0,5]},
      questions:[
        number('−6 的相反数是多少？',6,'找到与 −6 关于 0 对称的点。','−6 的相反数是 6。'),
        number('0 的相反数是多少？',0,'把 0 关于原点对称，会落在哪里？','0 关于原点对称后仍是 0，所以相反数是 0。'),
        choice('一个数与它的相反数相加，结果是？',['0','1','原来的数'],'0','两个方向相反、大小相同的变化会怎样？','a 与 −a 相加等于 0。')
      ]
    },
    {
      id:'cc-addition',student:'cc',title:'正负变化与加法',summary:'把正负数相加，可以理解成把几次变化合在一起。',domain:'数与代数',prerequisites:['cc-negative'],related:['cc-number-line','cc-opposite'],
      example:'先增加 5，再减少 3，合起来增加 2：5 + (−3) = 2。',curiosity:'一连串变化，怎样用一条算式记下来？',art:{type:'line',points:[-3,0,2,5]},
      questions:[
        number('先收入 8 元，再支出 5 元，净变化是多少元？',3,'把收入看作增加，支出看作减少。','8 + (−5) = 3，净增加 3 元。'),
        number('气温 −2℃，又降低 3℃，现在多少℃？',-5,'降低意味着沿数轴向左走。','−2 + (−3) = −5，温度是 −5℃。'),
        choice('−4 + 4 可以表示哪种情境？',['降低 4℃，又升高 4℃','连续降低两次 4℃','连续升高两次 4℃'],'降低 4℃，又升高 4℃','两次变化方向相反。','−4 是降低，+4 是升高，两次变化抵消。')
      ]
    },
    {
      id:'cc-pattern',student:'cc',title:'规律与变量',summary:'用字母表示变化的数量，可以把规律写得更短。',domain:'规律与逻辑',prerequisites:[],related:['cc-expression'],
      example:'每本书 6 元，买 n 本的费用是 6n 元。',curiosity:'知道前几个数，就能唯一确定一个数列的规律吗？',art:null,
      questions:[
        number('按“每次加 3”的规律：2、5、8，下一个数是？',11,'把最后一个数再加 3。','8 + 3 = 11。这里已明确规定每次加 3。'),
        choice('每袋有 4 个苹果，n 袋共有多少个？',['4 + n','4n','n − 4'],'4n','想一想 n 个 4 相加。','每袋 4 个，n 袋是 4 × n，简写为 4n。'),
        choice('只看到 1、2、4，就能确定下一个数一定是 8 吗？',['一定能','不能，还需要知道规律'],'不能，还需要知道规律','“每次乘 2”只是可能的规则之一。','有限几个数可以符合多种规则，需要额外说明才能确定下一项。')
      ]
    },
    {
      id:'cc-expression',student:'cc',title:'表达式里的数量关系',summary:'表达式把情境中的数量关系写成符号。',domain:'数与代数',prerequisites:['cc-pattern'],related:['cc-addition'],
      example:'原来有 x 本书，又买 3 本，现在有 x + 3 本。',curiosity:'同一个表达式，能描述多少种不同的生活情境？',art:null,
      questions:[
        choice('每张票 a 元，买 2 张，再付 3 元服务费，总价是？',['2a + 3','2(a + 3)','a + 5'],'2a + 3','服务费一共只有 3 元。','两张票是 2a 元，总服务费 3 元，所以总价为 2a + 3。'),
        number('当 x = 4 时，3x + 2 等于多少？',14,'先算 3 × 4，再加 2。','3 × 4 + 2 = 14。'),
        choice('“比 n 的 2 倍少 1”怎样表示？',['2(n − 1)','2n − 1','n − 2'],'2n − 1','先找到 n 的 2 倍，再减去 1。','n 的 2 倍是 2n，比它少 1 就是 2n − 1。')
      ]
    },
    {
      id:'cc-perimeter',student:'cc',title:'周长：绕一圈',summary:'周长是沿图形边界绕一圈的总长度。',domain:'图形与空间',prerequisites:[],related:['cc-expression'],
      example:'长 5 厘米、宽 3 厘米的长方形，周长是 5 + 3 + 5 + 3 = 16 厘米。',curiosity:'周长相同的长方形，面积也相同吗？',art:{type:'rectangle',widthLabel:'5 cm',heightLabel:'3 cm'},
      questions:[
        number('长方形长 6 厘米、宽 2 厘米，周长是多少厘米？',16,'四条边都要算进去。','6 + 2 + 6 + 2 = 16 厘米。'),
        choice('边长 a 的正方形，周长是？',['a²','4a','2a'],'4a','正方形有四条等长的边。','四条边各长 a，所以周长是 4a。'),
        choice('长方形的长增加 1 厘米，宽不变，周长增加多少？',['1 厘米','2 厘米','4 厘米'],'2 厘米','有几条边的长度一起增加了？','两条长边各增加 1 厘米，总周长增加 2 厘米。')
      ]
    },
    {
      id:'tt-groups',student:'tt',title:'几组，每组几个',summary:'先看有几组，再看每组有几个。',domain:'数感与分组',prerequisites:[],related:['tt-repeated','tt-sharing'],
      example:'3 个盘子，每盘 2 颗果子，就是 3 组，每组 2 个。',curiosity:'这些果子换一种分组方法，总数会变吗？',art:{type:'groups',groups:3,each:2},
      questions:[
        number('3 个盘子，每盘 2 颗果子，一共有几颗？',6,'可以一组一组数：2、4、6。','2 + 2 + 2 = 6，一共 6 颗。',{type:'groups',groups:3,each:2}),
        choice('图里有几组？',['2 组','3 组','6 组'],'3 组','每个框算一组。','有 3 个框，所以有 3 组。',{type:'groups',groups:3,each:2}),
        number('2 个盒子，每盒 4 个积木，一共有几个？',8,'先数一盒，再把另一盒加上。','4 + 4 = 8，一共 8 个。',{type:'groups',groups:2,each:4})
      ]
    },
    {
      id:'tt-composition',student:'tt',title:'十可以怎样分',summary:'同一个总数，可以拆成不同的两部分。',domain:'数感与组成',prerequisites:[],related:['tt-addition','tt-comparison'],
      example:'10 可以分成 6 和 4，也可以分成 7 和 3。',curiosity:'你能找到多少种把十颗豆子分成两堆的方法？',art:{type:'groups',groups:2,each:5},
      questions:[
        number('一共 10 颗豆子，一边有 6 颗，另一边有几颗？',4,'从 6 往上数到 10。','6 和 4 合起来是 10，所以另一边有 4 颗。'),
        choice('哪两张数字卡合起来是 10？',['7 和 3','7 和 2','6 和 3'],'7 和 3','每组都试着合起来数一数。','7 + 3 = 10；另外两组都是 9。'),
        number('8 颗红豆和几颗白豆合起来是 10 颗？',2,'8 之后再数几下到 10？','8、9、10，再加 2 颗就是 10 颗。')
      ]
    },
    {
      id:'tt-comparison',student:'tt',title:'谁多，谁少，多几个',summary:'比较数量，既可以看谁多，也可以看相差几个。',domain:'数感与比较',prerequisites:[],related:['tt-composition','tt-sharing'],
      example:'7 颗和 5 颗一一配对，会多出 2 颗。',curiosity:'把豆子排得更散，数量会变多吗？',art:null,
      questions:[
        choice('小兔有 8 颗，小熊有 6 颗，谁更多？',['小兔','小熊','一样多'],'小兔','比较 8 和 6。','8 比 6 大，所以小兔更多。'),
        number('小兔有 8 颗，小熊有 6 颗，小兔多几颗？',2,'先给每颗配一个朋友，看看剩下几颗。','8 颗中拿出 6 颗配对，还剩 2 颗。'),
        choice('把 6 颗豆子排得很开，数量会怎样？',['变多','变少','还是 6 颗'],'还是 6 颗','没有加豆子，也没有拿走豆子。','位置改变了，数量没有改变，仍然是 6 颗。')
      ]
    },
    {
      id:'tt-addition',student:'tt',title:'凑成十，再往前',summary:'先凑成十，有时能更容易看出总数。',domain:'数感与加减',prerequisites:['tt-composition'],related:['tt-repeated'],
      example:'8 + 5，可以把 5 分成 2 和 3：先 8 + 2 = 10，再加 3。',curiosity:'同一道加法，你能想出两种算法吗？',art:null,
      questions:[
        number('8 + 5，一共是多少？',13,'8 再加 2 是 10，5 里还剩 3。','8 + 5 = 8 + 2 + 3 = 13。'),
        choice('算 9 + 4，先从 4 里拿几个给 9，能凑成十？',['1 个','2 个','4 个'],'1 个','9 离 10 还差几个？','9 + 1 = 10，所以先拿 1 个。'),
        number('7 + 6，一共是多少？',13,'把 6 分成 3 和 3，先让 7 凑成 10。','7 + 3 + 3 = 13。')
      ]
    },
    {
      id:'tt-repeated',student:'tt',title:'一样多的几组',summary:'几组一样多的东西，可以用重复加法记下来。',domain:'乘法思想',prerequisites:['tt-groups'],related:['tt-sharing','tt-addition'],
      example:'4 组，每组 2 个，可以写成 2 + 2 + 2 + 2 = 8。',curiosity:'4 组每组 2 个，和 2 组每组 4 个，总数一样吗？',art:{type:'groups',groups:4,each:2},
      questions:[
        choice('3 组，每组 2 个，哪条算式对应这幅图？',['3 + 2','2 + 2 + 2','3 + 3'],'2 + 2 + 2','每个框有 2 个，一共有 3 个框。','每组记一个 2，所以是三个 2 相加。',{type:'groups',groups:3,each:2}),
        number('4 组，每组 2 个，一共几个？',8,'一组一组数：2、4、6、8。','2 + 2 + 2 + 2 = 8。',{type:'groups',groups:4,each:2}),
        choice('2 + 2 + 2 + 2 表示什么？',['2 组，每组 4 个','4 组，每组 2 个','4 组，每组 4 个'],'4 组，每组 2 个','这里有几个 2？','有四个 2，所以表示 4 组，每组 2 个。')
      ]
    },
    {
      id:'tt-pattern',student:'tt',title:'重复的小规律',summary:'找出重复的一小段，就能知道接下来是什么。',domain:'规律与逻辑',prerequisites:[],related:['tt-shapes'],
      example:'圆、方、圆、方……重复的一小段是“圆、方”。',curiosity:'你能用拍手和跺脚，编一个重复的小规律吗？',art:{type:'shapes',items:['○','□','○','□','○','?']},
      questions:[
        choice('圆、方、圆、方、圆，接下来是什么？',['圆','方','三角'],'方','每次“圆、方”重复一次。','圆后面是方，下一项是方。',{type:'shapes',items:['○','□','○','□','○','?']}),
        choice('圆、圆、方、圆、圆、方，重复的一小段是？',['圆、方','圆、圆、方','方、方、圆'],'圆、圆、方','找出完整出现两次的那一小段。','“圆、圆、方”完整重复了两次。'),
        choice('按“拍手、跺脚、跺脚”重复，拍手、跺脚、跺脚之后该做什么？',['拍手','跺脚'],'拍手','一小段结束后，从头开始。','这一小段完成了，下一段从拍手开始。')
      ]
    },
    {
      id:'tt-shapes',student:'tt',title:'转一转，还是它',summary:'图形转个方向，基本形状不会改变。',domain:'图形与空间',prerequisites:[],related:['tt-pattern'],
      example:'把正方形转成斜着放，它还是正方形。',curiosity:'一个正方形转到什么方向，看起来和原来一样？',art:{type:'shapes',items:['□','◇','△','○']},
      questions:[
        choice('正方形转个方向，还是正方形吗？',['是','不是'],'是','转动没有改变它的边和角。','边长和角没有改变，它还是正方形。'),
        number('一个三角形有几个角？',3,'沿着边走一圈，数数转弯的地方。','三角形有 3 个角。',{type:'shapes',items:['△']}),
        choice('哪一种图形没有角？',['三角形','正方形','圆'],'圆','想一想哪里有尖尖的转弯。','圆的边界是平滑的，没有角。')
      ]
    },
    {
      id:'tt-sharing',student:'tt',title:'公平分一分',summary:'公平分给几个人，可以让每个人得到一样多。',domain:'生活数学',prerequisites:['tt-groups'],related:['tt-repeated','tt-comparison'],
      example:'6 颗果子公平分给 2 只小兔，每只分到 3 颗。',curiosity:'如果果子不能切开，7 颗能全部平均分给 2 个人吗？',art:{type:'groups',groups:2,each:3},
      questions:[
        number('6 颗果子公平分给 2 只小兔，每只几颗？',3,'你一颗，我一颗，轮流分。','每只分到 3 颗，两只合起来是 6 颗。'),
        number('8 个积木平均放进 2 个盒子，每盒几个？',4,'让两个盒子一样多。','每盒 4 个，4 + 4 = 8。'),
        choice('7 颗完整果子平均分给 2 人，不能切开，能全部分完且一样多吗？',['能','不能，会剩 1 颗'],'不能，会剩 1 颗','每人分 3 颗后还剩多少？','每人 3 颗，用掉 6 颗，还剩 1 颗；不能全部分完且一样多。')
      ]
    }
  ]
};
for (const node of content.nodes) node.questions = node.questions.map((q, index) => ({ ...q, id:`${node.id}-q${index + 1}`, version:content.version }));

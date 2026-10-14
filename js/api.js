/* ================================================================
   api.js —— 数据请求统一封装
   ----------------------------------------------------------------
   项目现在还没有后端接口，所以这个文件先放两样东西：

     1. request()  —— 统一的请求函数。以后老师给了接口地址，
                      所有页面都用它请求，别各写各的 fetch

     2. MOCK       —— 本地假数据。页面先拿它渲染，
                      等接口好了把 MOCK.xxx 换成 request('/xxx') 就行

   数据都是真站上的真实内容（不是我编的）
   ================================================================ */


/* ================================================================
   1. 统一请求函数
   ================================================================ */
var API_BASE = '';   // 以后有接口地址填这里，例如 'https://api.example.com'

function request(url, options) {
  return fetch(API_BASE + url, options).then(function (res) {
    if (!res.ok) {
      throw new Error('请求失败：' + res.status);
    }
    return res.json();
  });
}


/* ================================================================
   2. 本地假数据（真站真实内容）
   ================================================================ */
var MOCK = {

  /* 首页两栏产品推荐（来自真站首页） */
  featuredProducts: [
    {
      name: 'Amorin Table.',
      desc: 'The Amorin Table isn\u2019t just a piece of furniture in a room; it opens up a new, flexible way of communicating and being together.',
      img: 'assets/images/index/teaser-amorin.jpg'
    },
    {
      name: 'Samay Armchair.',
      desc: 'A wooden armchair that exudes lightness and appears soft at first glance \u2013 and lives up to that promise.',
      img: 'assets/images/index/teaser-samay.jpg'
    }
  ],

  /* 首页 Magazine 三张卡（来自真站首页） */
  magazineCards: [
    { tag: 'References', title: 'Terminal 3, Frankfurt Airport, Germany',      img: 'assets/images/index/mag-terminal3.jpg' },
    { tag: 'References', title: 'Retreat Park am See Nattika, Penzlin, Germany', img: 'assets/images/index/mag-retreat.jpg' },
    { tag: '',           title: 'Special Exhibition at g\u00e4rtner, Hamburg',   img: 'assets/images/index/mag-hamburg.jpg' }
  ],

  /* 产品分类（真站 Products 下拉里的 11 个分类）—— 成员 B 的产品页要用 */
  productCategories: [
    'Chairs & Barstools', 'Lounge Chairs', 'Sofas & Benches', 'Tables',
    'Executive Desks', 'Media Integration', 'Storage', 'Carpets & Carpet Pillows',
    'Accessories & Stools', 'Beds', 'Exhibition pieces'
  ],

  /* 材料库入口（真站 Material Library 下的 9 项）—— 成员 C 的材料页要用 */
  materialCategories: [
    'Inspiration', 'Leathers', 'Fabrics', 'Graded-In fabrics', 'Woods',
    'Stones', 'Other surfaces', 'Materials in use', 'FAQ'
  ]
};

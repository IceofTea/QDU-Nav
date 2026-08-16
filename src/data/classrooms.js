// 楼宇与教室数据由 scripts/gen-classrooms.mjs 从教务处真实课程总表生成（2026年春季学期）
// 楼名对应校区区域参考学校文化标识系统；route 为通用指引，请以校园实地指示为准
export const buildings = [
  {
    "name": "1号教学楼",
    "campus": "金家岭校区",
    "zone": "西院",
    "desc": "金家岭西院主教学楼（官方名称：1号教学楼）",
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102",
          "103",
          "112",
          "117",
          "118"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "205",
          "206",
          "208"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "305",
          "306",
          "308",
          "310"
        ]
      }
    ],
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA1%E5%8F%B7%E6%95%99%E5%AD%A6%E6%A5%BC",
    "nearby": [],
    "route": []
  },
  {
    "name": "实验楼",
    "campus": "金家岭校区",
    "zone": "西院",
    "desc": "金家岭实验教学集中区（官方名称：实验楼），多为机房与实训教室",
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "205"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "304"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401",
          "402",
          "403",
          "410"
        ]
      }
    ],
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E5%AE%9E%E9%AA%8C%E6%A5%BC",
    "nearby": [],
    "route": []
  },
  {
    "name": "品正楼",
    "campus": "金家岭校区",
    "zone": "东院",
    "desc": "金家岭东院教学楼（官方名称：品正楼），紧邻图书馆",
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102",
          "103"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "204",
          "205",
          "206",
          "208"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "305",
          "306",
          "308",
          "310"
        ]
      }
    ],
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E5%93%81%E6%AD%A3%E6%A5%BC",
    "nearby": [],
    "route": []
  },
  {
    "name": "敏正楼",
    "campus": "金家岭校区",
    "zone": "东院",
    "desc": "金家岭东院办公与教学楼，出国留学培训基地在 107 室",
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "107（留学培训基地）"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "办公区"
        ]
      }
    ],
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E6%95%8F%E6%AD%A3%E6%A5%BC",
    "nearby": [],
    "route": []
  },
  {
    "name": "行正楼",
    "campus": "金家岭校区",
    "zone": "东院",
    "desc": "金家岭东院教学楼，招生办公在 202 室",
    "floors": [
      {
        "floor": "2F",
        "rooms": [
          "202（招生办公）"
        ]
      }
    ],
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E8%A1%8C%E6%AD%A3%E6%A5%BC",
    "nearby": [],
    "route": []
  },
  {
    "name": "办公楼",
    "campus": "金家岭校区",
    "zone": "东院",
    "desc": "金家岭校区学生事务大厅与保卫处在一楼",
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "学生事务大厅",
          "保卫处"
        ]
      }
    ],
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E5%8A%9E%E5%85%AC%E6%A5%BC",
    "nearby": [],
    "route": []
  },
  {
    "name": "德音楼",
    "campus": "浮山校区",
    "zone": "北院（师范学院）",
    "desc": "浮山校区北院（师范学院）排课教学楼，覆盖 29 间教室（据教务处 2026年春季学期课程总表） · 北院教学楼",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%BE%B7%E9%9F%B3%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "104",
          "105",
          "115",
          "116"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "202",
          "203",
          "206",
          "207",
          "208",
          "214",
          "215",
          "219",
          "220"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "302",
          "303",
          "306",
          "307",
          "308",
          "314",
          "319"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "403",
          "404",
          "406",
          "407"
        ]
      },
      {
        "floor": "5F",
        "rooms": [
          "507"
        ]
      },
      {
        "floor": "6F",
        "rooms": [
          "602",
          "603",
          "605",
          "606"
        ]
      }
    ]
  },
  {
    "name": "德晖楼",
    "campus": "浮山校区",
    "zone": "北院（师范学院）",
    "desc": "浮山校区北院（师范学院）排课教学楼，覆盖 12 间教室（据教务处 2026年春季学期课程总表） · 北院实验楼",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%BE%B7%E6%99%96%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "104",
          "106",
          "116",
          "137"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "206",
          "238"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "306",
          "313",
          "315",
          "326",
          "329"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401"
        ]
      }
    ]
  },
  {
    "name": "德雅楼",
    "campus": "浮山校区",
    "zone": "北院（师范学院）",
    "desc": "浮山校区北院（师范学院）排课教学楼，覆盖 17 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%BE%B7%E9%9B%85%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "102"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "204",
          "206",
          "212",
          "213",
          "214",
          "215"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "311（琴房）"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401",
          "405（北）",
          "410",
          "411"
        ]
      },
      {
        "floor": "6F",
        "rooms": [
          "602",
          "604",
          "609",
          "611"
        ]
      }
    ]
  },
  {
    "name": "东12教",
    "campus": "浮山校区",
    "zone": "东院",
    "desc": "浮山校区东院排课教学楼，覆盖 22 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E4%B8%9C12%E6%95%99",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "104",
          "105",
          "106",
          "107"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "203",
          "205",
          "206",
          "207",
          "208",
          "209"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "305",
          "306",
          "307",
          "308",
          "309"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401",
          "405",
          "406",
          "407",
          "408"
        ]
      }
    ]
  },
  {
    "name": "纺织实验楼",
    "campus": "浮山校区",
    "zone": "东院",
    "desc": "浮山校区东院排课教学楼，覆盖 3 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E7%BA%BA%E7%BB%87%E5%AE%9E%E9%AA%8C%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "104-B",
          "104-C",
          "107-B"
        ]
      }
    ]
  },
  {
    "name": "文化艺术楼C座",
    "campus": "浮山校区",
    "zone": "东院",
    "desc": "浮山校区东院排课教学楼，覆盖 2 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%96%87%E5%8C%96%E8%89%BA%E6%9C%AF%E6%A5%BCC%E5%BA%A7",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "3F",
        "rooms": [
          "306",
          "308"
        ]
      }
    ]
  },
  {
    "name": "行思楼",
    "campus": "浮山校区",
    "zone": "东院",
    "desc": "浮山校区东院排课教学楼，覆盖 2 间教室（据教务处 2026年春季学期课程总表） · 原东4教",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E8%A1%8C%E6%80%9D%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "103"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "302"
        ]
      }
    ]
  },
  {
    "name": "东院实验楼",
    "campus": "浮山校区",
    "zone": "东院",
    "desc": "浮山校区东院排课教学楼，覆盖 14 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E4%B8%9C%E9%99%A2%E5%AE%9E%E9%AA%8C%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "3F",
        "rooms": [
          "303",
          "315",
          "322"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "403",
          "405",
          "407",
          "408",
          "409",
          "410",
          "411",
          "413",
          "414",
          "415",
          "416"
        ]
      }
    ]
  },
  {
    "name": "东院图书馆",
    "campus": "浮山校区",
    "zone": "东院",
    "desc": "浮山校区东院排课教学楼，覆盖 5 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E4%B8%9C%E9%99%A2%E5%9B%BE%E4%B9%A6%E9%A6%86",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "109"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "203"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "305"
        ]
      }
    ]
  },
  {
    "name": "图文中心",
    "campus": "浮山校区",
    "zone": "东院",
    "desc": "浮山校区东院排课教学楼，覆盖 9 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%9B%BE%E6%96%87%E4%B8%AD%E5%BF%83",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "4F",
        "rooms": [
          "401",
          "402",
          "404",
          "406"
        ]
      },
      {
        "floor": "5F",
        "rooms": [
          "501",
          "502",
          "504",
          "511",
          "512"
        ]
      }
    ]
  },
  {
    "name": "浩园1教",
    "campus": "浮山校区",
    "zone": "浮山苑",
    "desc": "浮山校区浮山苑排课教学楼，覆盖 23 间教室（据教务处 2026年春季学期课程总表） · 浩园1号",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%B5%A9%E5%9B%AD1%E6%95%99",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102",
          "104"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "204"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "306",
          "307"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401",
          "402",
          "403",
          "404",
          "405",
          "406",
          "407"
        ]
      },
      {
        "floor": "5F",
        "rooms": [
          "502",
          "503",
          "504",
          "505",
          "506",
          "507"
        ]
      },
      {
        "floor": "6F",
        "rooms": [
          "606"
        ]
      }
    ]
  },
  {
    "name": "博学楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 45 间教室（据教务处 2026年春季学期课程总表） · 原西1教",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E5%AD%A6%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102",
          "103",
          "104",
          "105",
          "106",
          "107",
          "108",
          "109",
          "111"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "204",
          "205",
          "206",
          "207",
          "208",
          "209",
          "210",
          "211",
          "212"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "304",
          "305",
          "306",
          "307",
          "308",
          "309",
          "310",
          "311",
          "312",
          "313",
          "314"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401",
          "402",
          "403",
          "404",
          "410",
          "412"
        ]
      },
      {
        "floor": "5F",
        "rooms": [
          "504",
          "505",
          "506"
        ]
      }
    ]
  },
  {
    "name": "博知楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 45 间教室（据教务处 2026年春季学期课程总表） · 原西4教",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E7%9F%A5%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102",
          "103",
          "104",
          "105",
          "106",
          "107",
          "108",
          "109",
          "111"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "204",
          "205",
          "206",
          "207",
          "208",
          "209",
          "210",
          "211",
          "212",
          "213",
          "214"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "304",
          "305",
          "306",
          "307",
          "308",
          "309",
          "310",
          "311",
          "312",
          "313",
          "314"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "405",
          "406",
          "407",
          "409"
        ]
      },
      {
        "floor": "5F",
        "rooms": [
          "505",
          "506",
          "508-专业实验中心"
        ]
      }
    ]
  },
  {
    "name": "博远楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 36 间教室（据教务处 2026年春季学期课程总表） · 原西5教",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E8%BF%9C%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102",
          "103",
          "104",
          "105",
          "106",
          "111"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "204",
          "205",
          "206",
          "207",
          "208",
          "209",
          "210",
          "211",
          "212",
          "213",
          "214"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "304",
          "305",
          "306",
          "307",
          "308",
          "309",
          "310",
          "311",
          "312",
          "313",
          "314"
        ]
      },
      {
        "floor": "6F",
        "rooms": [
          "613"
        ]
      }
    ]
  },
  {
    "name": "博文楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 26 间教室（据教务处 2026年春季学期课程总表） · 原西2教",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E6%96%87%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "2F",
        "rooms": [
          "210",
          "211",
          "213",
          "214",
          "215",
          "216",
          "219"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "305",
          "306",
          "307",
          "308",
          "309",
          "310"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401",
          "402",
          "403",
          "405",
          "408",
          "409",
          "410",
          "413"
        ]
      },
      {
        "floor": "5F",
        "rooms": [
          "519A",
          "532"
        ]
      }
    ]
  },
  {
    "name": "博观楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 1 间教室（据教务处 2026年春季学期课程总表） · 原西3教",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E8%A7%82%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "3F",
        "rooms": [
          "301"
        ]
      }
    ]
  },
  {
    "name": "博逸楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 9 间教室（据教务处 2026年春季学期课程总表） · 原西6教",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E9%80%B8%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "2F",
        "rooms": [
          "204"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "404"
        ]
      },
      {
        "floor": "5F",
        "rooms": [
          "501",
          "508",
          "510",
          "511",
          "514",
          "516",
          "520"
        ]
      }
    ]
  },
  {
    "name": "慎行楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 3 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%85%8E%E8%A1%8C%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "3F",
        "rooms": [
          "302",
          "303",
          "309"
        ]
      }
    ]
  },
  {
    "name": "博雅楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 8 间教室（据教务处 2026年春季学期课程总表） · 原基础医学楼",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E5%8D%9A%E9%9B%85%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "108"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "207",
          "209",
          "211",
          "212",
          "213",
          "217",
          "219"
        ]
      }
    ]
  },
  {
    "name": "西院2教",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 29 间教室（据教务处 2026年春季学期课程总表） · 即博文楼",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E8%A5%BF%E9%99%A22%E6%95%99",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "102",
          "103",
          "104",
          "107",
          "108",
          "109",
          "110"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "202",
          "203",
          "204",
          "207",
          "208",
          "209",
          "210"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "302",
          "303",
          "304",
          "305",
          "308",
          "309",
          "310",
          "311"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "402",
          "403",
          "404",
          "405",
          "408",
          "409",
          "410"
        ]
      }
    ]
  },
  {
    "name": "西院1教",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 33 间教室（据教务处 2026年春季学期课程总表） · 即博学楼",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E8%A5%BF%E9%99%A21%E6%95%99",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "101",
          "102",
          "103",
          "104",
          "107",
          "108",
          "109",
          "111"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "201",
          "202",
          "203",
          "204",
          "207",
          "208",
          "209",
          "210"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "301",
          "302",
          "303",
          "304",
          "307",
          "308",
          "309",
          "310",
          "311"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401",
          "402",
          "403",
          "404",
          "407",
          "408",
          "409",
          "410"
        ]
      }
    ]
  },
  {
    "name": "西院2号实验楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 24 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E8%A5%BF%E9%99%A22%E5%8F%B7%E5%AE%9E%E9%AA%8C%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "104",
          "105",
          "106",
          "107",
          "108",
          "110",
          "111",
          "113"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "204",
          "205",
          "206",
          "207",
          "208",
          "210",
          "211",
          "213"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "304",
          "305",
          "306",
          "307",
          "308",
          "310",
          "311",
          "313"
        ]
      }
    ]
  },
  {
    "name": "西院3号实验楼",
    "campus": "浮山校区",
    "zone": "西院",
    "desc": "浮山校区西院排课教学楼，覆盖 14 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%B5%AE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E8%A5%BF%E9%99%A23%E5%8F%B7%E5%AE%9E%E9%AA%8C%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "1F",
        "rooms": [
          "104",
          "105",
          "106",
          "107"
        ]
      },
      {
        "floor": "2F",
        "rooms": [
          "204",
          "205",
          "206",
          "207",
          "208",
          "210",
          "211",
          "213"
        ]
      },
      {
        "floor": "3F",
        "rooms": [
          "305",
          "306"
        ]
      }
    ]
  },
  {
    "name": "科技研发中心A",
    "campus": "金家岭校区",
    "zone": "东院",
    "desc": "金家岭校区东院排课教学楼，覆盖 5 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E7%A7%91%E6%8A%80%E7%A0%94%E5%8F%91%E4%B8%AD%E5%BF%83A",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "4F",
        "rooms": [
          "401",
          "402",
          "403",
          "405",
          "406"
        ]
      }
    ]
  },
  {
    "name": "教学楼",
    "campus": "金家岭校区",
    "zone": "西院",
    "desc": "金家岭校区西院排课教学楼，覆盖 6 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E9%87%91%E5%AE%B6%E5%B2%AD%E6%A0%A1%E5%8C%BA%E6%95%99%E5%AD%A6%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "3F",
        "rooms": [
          "301",
          "303",
          "304",
          "305",
          "306"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "401"
        ]
      }
    ]
  },
  {
    "name": "松山校区营养楼",
    "campus": "松山校区",
    "zone": "",
    "desc": "松山校区排课教学楼，覆盖 4 间教室（据教务处 2026年春季学期课程总表）",
    "mapUrl": "https://www.amap.com/search?query=%E9%9D%92%E5%B2%9B%E5%A4%A7%E5%AD%A6%E6%9D%BE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E6%9D%BE%E5%B1%B1%E6%A0%A1%E5%8C%BA%E8%90%A5%E5%85%BB%E6%A5%BC",
    "nearby": [],
    "route": [],
    "floors": [
      {
        "floor": "2F",
        "rooms": [
          "204"
        ]
      },
      {
        "floor": "4F",
        "rooms": [
          "404",
          "405",
          "409"
        ]
      }
    ]
  }
]

export const campusFilters = ['全部', '浮山校区', '金家岭校区', '松山校区']

export function searchRooms(keyword) {
  const k = keyword.trim()
  return buildings.filter((b) => {
    if (!k) return true
    const kw = k.replace(/\s/g, '')
    const hitName = b.name.replace(/\s/g, '').includes(kw)
    const hitCampus = b.campus.includes(k)
    const hitZone = b.zone.includes(k)
    const hitRoom = b.floors.some((f) => f.rooms.some((r) => r.includes(k)))
    return hitName || hitCampus || hitZone || hitRoom
  })
}

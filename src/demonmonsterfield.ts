export const DEMON_MONSTER_IMAGE_MAP: Record<string, string> = {
"성벽 그림자 쥐":"https://i.ibb.co/ks0qLS4Y/Gemini-Generated-Image-z726baz726baz726.png", 
"제국 하급 부역자":"https://i.ibb.co/cK9HjCWF/Gemini-Generated-Image-su1dg2su1dg2su1d.png", 
"어둠의 찌꺼기 슬라임":"https://i.ibb.co/Q3Lptvyw/Gemini-Generated-Image-y3u2o3y3u2o3y3u2.png", 
"길들여진 박쥐":"https://i.ibb.co/4wr5Fhhr/Gemini-Generated-Image-awqvrfawqvrfawqv.png",
"네크로디움 초병":"https://i.ibb.co/84gMBZzT/Gemini-Generated-Image-gg4wgfgg4wgfgg4w.png", 
"가문의 사냥개":"https://i.ibb.co/jv1xSY3N/Gemini-Generated-Image-d0uiw4d0uiw4d0ui.png", 
"그림자 밀수꾼":"https://i.ibb.co/BFBS69X/Gemini-Generated-Image-ghxs2fghxs2fghxs.png", 
"하급 마인 병사":"https://i.ibb.co/KxPPRBbT/Gemini-Generated-Image-h6fhcyh6fhcyh6fh.png",
"제국 마법 장교":"https://i.ibb.co/8g78G7Th/Gemini-Generated-Image-iolkeoiolkeoiolk.png", 
"고위 마인 귀족":"https://i.ibb.co/BVDNjbBf/Gemini-Generated-Image-7sd4kl7sd4kl7sd4.png", 
"지옥마 기병":"https://i.ibb.co/HT69fR4Q/Gemini-Generated-Image-t1ef45t1ef45t1ef.png", 
"영혼 계약자":"https://i.ibb.co/ZP8jDjg/Gemini-Generated-Image-ucj26iucj26iucj2.png",
"네크로디움 중갑 기사":"https://i.ibb.co/WS7mZjb/Gemini-Generated-Image-q405qcq405qcq405.png",
 "의회 수호 가고일":"https://i.ibb.co/wN4x8NnV/Gemini-Generated-Image-y21f3qy21f3qy21f.png", 
 "제국 흑마법사":"https://i.ibb.co/7tj6rfhJ/Gemini-Generated-Image-mhnisimhnisimhni.png", 
 "어둠의 처형자":"https://i.ibb.co/LD9hj7s6/Gemini-Generated-Image-8hrjp38hrjp38hrj.png",
            "제국 군단장":"https://i.ibb.co/S42jwMG4/Gemini-Generated-Image-6kx3b16kx3b16kx3.png", 
            "마인 대공의 환영":"https://i.ibb.co/xSdN4nWz/Gemini-Generated-Image-tytbqqtytbqqtytb.png", 
            "심연의 흑룡 파편":"https://i.ibb.co/99f0F3XP/Gemini-Generated-Image-58foze58foze58fo.png", 
            "금단 마법의 수호자":"https://i.ibb.co/fVNLkZkx/Gemini-Generated-Image-5fzdul5fzdul5fzd.png",
            "폭주하는 마력 핵":"https://i.ibb.co/Ww0vY8J/Gemini-Generated-Image-ku3niuku3niuku3n.png", 
            "제국 멸망의 전령":"https://i.ibb.co/m58Njg6r/Gemini-Generated-Image-stkdecstkdecstkd.png", 
            "고대 마인의 원혼":"https://i.ibb.co/6Jctk51M/Gemini-Generated-Image-t4faet4faet4faet.png", 
            "심연의 아수라":"https://i.ibb.co/7t9Gjg30/Gemini-Generated-Image-1hyqx71hyqx71hyq.png",
            "공허의 제국 의회 의원":"https://i.ibb.co/v4jF8tSy/Gemini-Generated-Image-mb6jsmb6jsmb6jsm.png", 
            "차원을 가르는 자크":"https://i.ibb.co/tF6zPwK/Gemini-Generated-Image-avz4cfavz4cfavz4.png", 
            "무(無)의 집행자":"https://i.ibb.co/8WLWjTH/Gemini-Generated-Image-9gytoh9gytoh9gyt.png",
  "제국의 시조 마인":"https://i.ibb.co/bjBWPYdM/Gemini-Generated-Image-cgf7c6cgf7c6cgf7.png", 
  "태초의 어둠의 잔영":"https://i.ibb.co/PzM5RkCr/Gemini-Generated-Image-hk11vjhk11vjhk11.png", 
  "심연의 군주 베리알의 환영":"https://i.ibb.co/rR2ZDDK4/Gemini-Generated-Image-2x2kgh2x2kgh2x2k.png"
};

export const DEMON_HUNT_THEMES = {
    "네크로디움 제국": {
        fieldSuffix: "암흑의 마법 요새와 금지된 평원",
        monsters: {
            beginner: ["성벽 그림자 쥐", "제국 하급 부역자", "어둠의 찌꺼기 슬라임", "길들여진 박쥐"],
            lower: ["네크로디움 초병", "가문의 사냥개", "그림자 밀수꾼", "하급 마인 병사"],
            intermediate: ["제국 마법 장교", "고위 마인 귀족", "지옥마 기병", "영혼 계약자"],
            advanced: ["네크로디움 중갑 기사", "의회 수호 가고일", "제국 흑마법사", "어둠의 처형자"],
            elite: ["제국 군단장", "마인 대공의 환영", "심연의 흑룡 파편", "금단 마법의 수호자"],
            disaster: ["폭주하는 마력 핵", "제국 멸망의 전령", "고대 마인의 원혼", "심연의 아수라"],
            abyss: ["공허의 제국 의회 의원", "차원을 가르는 자크", "무(無)의 집행자"],
            mythic: ["제국의 시조 마인", "태초의 어둠의 잔영", "심연의 군주 베리알의 환영"]
        }
    }
};
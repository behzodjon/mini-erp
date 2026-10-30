# Foydalanuvchi qo'llanmasi

Bu qo'llanma ichimliklar do'koni egasi uchun. Dastur sizga uchta savolga javob beradi:

1. **Menda qancha tovar bor?** Necha dona va necha blok.
2. **U qayerda turibdi?** Qaysi omborda, qaysi javonda yoki muzlatgichda.
3. **Haqiqatan foyda qilyapmanmi?** Sof foyda, qarzlar va xarajatlar hisobga olingan holda.

Dastur manzili: https://beverage-shop-erp.onrender.com

> Bepul serverda dastur bir muddat ishlatilmasa "uxlab qoladi". Birinchi ochilishda taxminan 1 daqiqa kutish kerak bo'lishi mumkin. Keyin tez ishlaydi.

## 1. Kirish va chiqish

1. Manzilni oching va **login** hamda **parol**ni kiriting.
2. Sahifani yangilasangiz ham tizimdan chiqib ketmaysiz.
3. Ishni tugatgach, chap pastdagi **Chiqish** tugmasini bosing. Kompyuter boshqalar bilan umumiy bo'lsa, buni albatta qiling.

Chap tomonda bo'limlar: **Mahsulotlar, Omborlar, Xaridlar, Savdolar, Inventarizatsiya, Kassa, Hisobotlar**.

## 2. Asosiy tushunchalar

- **Dona** — eng kichik birlik (bitta shisha).
- **Blok** — bir mahsulotning qadoqlangan to'plami. Masalan, Cola 0.5L ning bir blokida 12 dona bor. Blokdagi dona soni mahsulotga qarab farq qiladi.
- **"24 blok + 5 dona"** degani: 24 ta to'liq blok va yana 5 ta alohida dona. Cola 0.5L (blokda 12 dona) uchun bu 24 × 12 + 5 = **293 dona**. Dastur har doim ikkala ko'rinishni ham ko'rsata oladi.
- **Qoralama** — hali kuchga kirmagan hujjat. Uni o'zgartirish va o'chirish mumkin. Qoralama **ombor va kassaga ta'sir qilmaydi**.
- **Bajarish** — qoralamani kuchga kiritish. Shundan keyingina tovar va pul harakati yoziladi. **Bajarilgan hujjatni o'zgartirib bo'lmaydi.**
- **O'rtacha tannarx** — mahsulotning bir donasi sizga o'rtacha necha so'mga tushgani. Har safar tovar sotib olganda dastur uni o'zi qayta hisoblaydi (batafsil 8-bo'limda).

Pul so'mda, butun sonlarda yoziladi.

## 3. Birinchi kun: sozlash

Dasturni birinchi marta ishga tushirganda quyidagi tartibda ishlang.

### 3.1. Omborlarni yaratish

1. **Omborlar** bo'limini oching.
2. **Yangi ombor** tugmasini bosing, nomini yozing (masalan, "Asosiy ombor") va **Saqlash**ni bosing.
3. Ombor ichida joy yaratish uchun ombor yonidagi **Sub-ombor qo'shish** tugmasini bosing. Masalan: "Asosiy ombor" ichida "A qator", "B qator"; "Do'kon" ichida "Peshtaxta", "Muzlatgich". Ichma-ich istalgancha chuqurlikda yaratish mumkin.
4. Tugmalar: nomini o'zgartirish, ichiga yangi joy qo'shish, o'chirish. **Ichida joy yoki tovar bor omborni o'chirib bo'lmaydi.**
5. Tovar faqat eng pastdagi joyda emas, istalgan omborda (ota omborda ham) turishi mumkin. Ota ombor o'z ichidagi barcha joylar yig'indisini ko'rsatadi.

### 3.2. Mahsulotlarni qo'shish

1. **Mahsulotlar** bo'limini oching va **Yangi mahsulot**ni bosing.
2. To'ldiring:
   - **Nomi** — masalan, "Cola 0.5L".
   - **SKU** — ixtiyoriy, o'xshash mahsulotlarni ajratish uchun kod yoki shtrix-kod.
   - **Blokda (dona)** — bir blokda nechta dona. Masalan, 12.
   - **Sotuv narxi (so'm)** — bir dona uchun odatiy narx. Savdoda shu narx o'zi chiqadi, xohlasangiz o'zgartirasiz.
3. **Saqlash**ni bosing.

Muhim:

- Mahsulotga birinchi tovar harakati yozilgach, **"Blokda (dona)" ni o'zgartirib bo'lmaydi**. Aks holda eski hisobotlardagi bloklar soni jimgina o'zgarib ketardi. Shuning uchun uni to'g'ri kiriting.
- Nomi, SKU va sotuv narxini istalgan vaqtda o'zgartirsa bo'ladi.
- Sotilmaydigan mahsulotni **Arxivlash** mumkin: u tanlov ro'yxatlaridan yo'qoladi, lekin tarix saqlanadi. **Arxivdagilarni ko'rsatish** belgisi bilan ularni ko'rish, **Qaytarish** bilan qaytarish mumkin.
- Ro'yxat yuqoridagi qidiruv orqali nom yoki SKU bo'yicha qidiriladi.
- Ro'yxatda har bir mahsulotning **O'rtacha tannarx**i ko'rinadi (dastur hisoblaydi, siz kiritmaysiz).

### 3.3. Boshlang'ich qoldiqni kiritish

Siz allaqachon omborda turgan tovarni dasturga bir marta kiritishingiz kerak. Buning uchun **boshlang'ich qoldiq** xaridi ishlatiladi: u tovarni qo'shadi, lekin **kassadan pul chiqarmaydi** (chunki pulni siz ilgari to'lagansiz).

1. **Xaridlar** → **Yangi xarid**.
2. **Boshlang'ich qoldiq (kassadan pul chiqmaydi)** belgisini yoqing.
3. Qatorlarni qo'shing (4.2-bo'limdagidek): mahsulot, ombor, miqdor, narx. Narx sifatida tovarning o'zingizga tushgan narxini yozing, chunki foyda shundan hisoblanadi.
4. **Saqlash**, so'ng **Bajarish**.

### 3.4. Boshlang'ich kassani kiritish

Do'konda hozir qancha pul bor bo'lsa, shuni kiriting.

1. **Kassa** → **Yangi yozuv**.
2. Yo'nalish: **Kirim**. Turi: **Egasi kiritdi / boshlang'ich kassa**.
3. Summa va sanani yozing, **Saqlash**.

Bu foyda emas, shunchaki sizning o'z pulingiz, shuning uchun foydaga qo'shilmaydi (8.4-bo'limga qarang). Boshlang'ich kassa kiritmasangiz ham ishlayverasiz, lekin kassa qoldig'i manfiy bo'lib, qizil rangda ko'rinishi mumkin. Dastur sizni to'smaydi.

## 4. Tovar qabul qilish (xarid)

### 4.1. Qachon ishlatiladi

Yetkazib beruvchidan tovar kelganda.

### 4.2. Qadamlar

1. **Xaridlar** → **Yangi xarid**.
2. Yuqorida **odatiy ombor**ni tanlang. U har bir yangi qatorga o'zi qo'yiladi. Odatda joyni bir marta tanlaysiz.
3. **Qator qo'shish** orqali har bir mahsulot uchun qator qo'shing:
   - **Mahsulot**ni tanlang.
   - **Birlik**: **dona** yoki **blok**. Yetkazib beruvchining hisob-fakturasida qanday yozilgan bo'lsa, shunday kiriting.
   - **Miqdor**.
   - **Narx (so'm)** — **tanlangan birlik uchun**. Blok tanlasangiz, narx bir blok uchun. Bo'lib hisoblash shart emas.
   - **Ombor** — kerak bo'lsa qator uchun boshqa joyni tanlang. Bitta yetkazib berishni bir necha joyga bo'lib qo'yish mumkin.
4. Qator jami va hujjat jami pastda ko'rinadi. Ularni hisob-faktura bilan solishtiring.
5. **Saqlash** — hujjat **qoralama** bo'ladi (raqami `XAR-0001` ko'rinishida). Hali hech narsa o'zgarmadi.
6. Tovar haqiqatan kelganda ro'yxatdan **Bajarish**ni bosing va tasdiqlang.

### 4.3. Bajarilganda nima bo'ladi

- Har bir qatordagi omborda mahsulot qoldig'i oshadi.
- Mahsulotning **o'rtacha tannarxi** qayta hisoblanadi.
- Kassaga xarid summasi bo'yicha **chiqim** avtomatik yoziladi (siz buni qo'lda kiritmaysiz). Boshlang'ich qoldiq xaridida chiqim yozilmaydi.

Xato topsangiz: qoralamani **Tahrirlash** yoki **O'chirish** mumkin. Bajarilgan xaridni o'zgartirib bo'lmaydi, uni faqat **Ko'rish** mumkin.

## 5. Sotish

1. **Savdolar** → **Yangi savdo**.
2. Yuqorida **odatiy ombor**ni tanlang.
3. Qator qo'shing: mahsulot, birlik (dona yoki blok), miqdor. **Narx** mahsulotning sotuv narxidan o'zi to'ladi. Chegirma yoki blok narxi uchun o'zgartiring.
4. Qatorda tanlangan joydagi **mavjud miqdor** ko'rinadi, shunga qarab joyni tanlang.
5. Bir mijoz bir mahsulotni ikki joydan olishi mumkin (masalan, muzlatgichdan 40 va javondan 10). Buning uchun shu mahsulotdan ikkita qator qo'shing, har biriga o'z joyini bering. Bu bitta hujjat bo'ladi.
6. **Saqlash** — qoralama (`SAV-0001` ko'rinishida).
7. Savdo tugagach **Bajarish**ni bosing va tasdiqlang.

Bajarilganda:

- Har bir qatordagi joydan tovar kamayadi.
- Dastur tovarning o'sha paytdagi **o'rtacha tannarx**ini saqlab qo'yadi (foyda hisobi uchun).
- Kassaga savdo summasi **kirim** bo'lib avtomatik yoziladi.

**Yetarli tovar bo'lmasa**, savdo bajarilmaydi. Dastur qaysi qator yetmayotganini ko'rsatadi va **hech narsani o'zgartirmaydi**: yarim bajarilgan savdo bo'lmaydi. Qatordagi miqdorni kamaytiring yoki boshqa joyni tanlang.

Ikki marta bosib yuborsangiz ham savdo bir marta bajariladi: tovar va pul ikki marta hisoblanmaydi.

## 6. Tovarni sanash (inventarizatsiya)

Sanash tizimdagi qoldiqni haqiqiy holatga tenglashtiradi. Yo'qotish yoki ortiqcha tovar aniqlanadi.

1. **Inventarizatsiya** → **Yangi inventarizatsiya**.
2. **Bitta ombor**ni tanlang (bir vaqtda bitta joyni sanash qulay: masalan, "Peshtaxta").
3. Mahsulotlarni qo'shing va har biri uchun **o'zingiz sanagan miqdor**ni kiriting (dona yoki blok bilan).
4. Qatorda **Tizimda (dona)** ustuni ko'rinadi. Katta farq bo'lsa, bajarishdan oldin qayta sanab ko'ring.
5. **Saqlash** (`INV-0001`), keyin **Bajarish**.

Bajarilganda dastur sanalgan miqdorni **bajarilish paytidagi** tizim qoldig'i bilan solishtiradi. Sanashni boshlaganingizdan keyin savdo qilingan bo'lsa ham, natija buzilmaydi. Qoldiq sanalgan miqdorga tenglashadi. **Farq (dona)** va **Farq qiymati (so'm)** ko'rinadi: kamomad yo'qotish, ortiqcha esa daromad hisoblanadi (o'rtacha tannarxda baholanadi). Bu **Foyda va zarar** hisobotiga kiradi.

## 7. Kassa: qarzlar va xarajatlar

**Kassa** bo'limida do'kondagi har bir pul harakati ko'rinadi, qoldiq bilan birga. Savdo va xarid yozuvlari avtomatik paydo bo'ladi. Qolganlarini siz qo'lda kiritasiz.

### 7.1. Yangi yozuv

1. **Kassa** → **Yangi yozuv**.
2. **Yo'nalish**ni tanlang: **Kirim** (pul kirdi) yoki **Chiqim** (pul chiqdi). Yo'nalishga qarab mos turlar chiqadi.
3. **Turi**, **summa**, **sana** va ixtiyoriy **izoh**ni kiriting.
4. **Saqlash**. Yozuv `KAS-0001` ko'rinishidagi raqam oladi.

### 7.2. Xarajatlar

**Chiqim** yo'nalishida quyidagilarni tanlang:

- **Yo'l kira**, **Ijara**, **Oylik**, **Boshqa xarajat** — bular foydani kamaytiradi.

**Kirim** yo'nalishida **Boshqa daromad** — foydani oshiradi.

### 7.3. Qarzlar

Qarzli yozuvlarda **kontragent** (odam yoki tashkilot) majburiy, chunki qarz har bir kishi bo'yicha yuritiladi. Yangi kontragentni yozuv oynasining o'zida (**Yangi kontragent yaratish**) qo'shish mumkin.

| Vaziyat | Yo'nalish | Turi |
|---|---|---|
| Siz kimgadir qarz berdingiz | Chiqim | **Qarz berildi** |
| U qarzni qaytardi | Kirim | **Berilgan qarz qaytarildi** |
| Siz kimdandir qarz oldingiz | Kirim | **Qarz olindi** |
| Siz olgan qarzni qaytardingiz | Chiqim | **Olingan qarz qaytarildi** |

### 7.4. Egasining puli

- Do'konga o'z pulingizni qo'ysangiz: **Kirim** → **Egasi kiritdi / boshlang'ich kassa**.
- Do'kondan o'zingiz uchun pul olsangiz: **Chiqim** → **Egasi yechib oldi**.

Bular foydaga ta'sir qilmaydi (8.4-bo'limga qarang).

Kassa qoldig'i manfiy bo'lsa, u qizil rangda ko'rinadi. Bu faqat ogohlantirish: ishlashni to'xtatmaydi. Odatda boshlang'ich kassa kiritilmagani yoki yozuv unutilgani sababdan bo'ladi.

## 8. Hisobotlarni o'qish

**Hisobotlar** bo'limida uchta hisobot bor: **Qoldiq**, **Savdo**, **Foyda va zarar**. Hisobotlarda faqat **bajarilgan** hujjatlar hisobga olinadi. Qoralamalar raqamlarni buzmaydi.

### 8.1. Qoldiq

Hozir omborda nima bor.

- **Mahsulot bo'yicha** ko'rinishi: har bir mahsulot uchun jami qoldiq **dona** hamda **blok + dona** ko'rinishida (masalan, "24 blok + 5 dona") va qiymati o'rtacha tannarxda. "Menda qancha Cola bor?" degan savolga shu yerdan javob olasiz. Mahsulot qatorini ochsangiz, u qaysi omborda qanchadan turgani ko'rinadi.
- **Ombor bo'yicha** ko'rinishi: ombor daraxti. Har bir ota ombor o'z ichidagi barcha joylarning yig'indisini ko'rsatadi.

Sana tanlash shart emas, hisobot hozirgi holatni ko'rsatadi.

### 8.2. Savdo

Tanlangan davr uchun bajarilgan savdolar: savdolar soni, **tushum**, **sotilgan tovar tannarxi** va **yalpi foyda** (tushum minus tannarx). **Mahsulotlar bo'yicha** jadvali qaysi mahsulot ko'proq foyda keltirishini ko'rsatadi. Ro'yxatdagi savdoni bossangiz, uning tafsilotlari ochiladi.

### 8.3. Foyda va zarar

Davrni tanlang (**Boshlanish sanasi** va **Tugash sanasi**; birinchisi oyning boshi, ikkinchisi bugun qilib qo'yilgan). Hisobot shunday quriladi:

```
Tushum (bajarilgan savdolar)
− Sotilgan tovar tannarxi
= Yalpi foyda
− Xarajatlar (Yo'l kira, Ijara, Oylik, Boshqa xarajat)
± Inventarizatsiya natijasi
+ Boshqa daromad
= Sof foyda
```

Sanalar do'konning mahalliy vaqti (Toshkent) bo'yicha hisoblanadi. Savdo va inventarizatsiya **bajarilgan kuni**ga, qo'lda kiritilgan kassa yozuvlari esa siz yozgan **sanaga** tushadi.

Hisobot ostidagi **Kassa va qarzlar** bo'limida:

- **Kassadagi pul** — hozir kassada bo'lishi kerak bo'lgan pul;
- **Menga qarzdorlar** — sizga kim qancha qarz;
- **Men qarzdorman** — siz kimga qancha qarz.

### 8.4. Nega qarzlar foydani o'zgartirmaydi

Qarz olish pulni oshiradi, lekin boylik emas: uni qaytarishingiz kerak. Misol: siz 3 000 000 so'm qarz oldingiz. Kassa 3 million ko'payadi, lekin siz shuncha foyda qilmadingiz. Qarzni qaytarganingizda kassa kamayadi, lekin bu zarar ham emas. Berilgan qarz ham shunday: pul chiqadi, lekin u yo'qolmadi, sizda unga da'vo bor. O'zingiz do'konga qo'ygan yoki undan olgan pul ham foyda yoki zarar emas.

Shuning uchun **Foyda va zarar** hisobotida qarzlar va egasi pullari **yo'q**. Ular **Kassa va qarzlar** bo'limida ko'rinadi. Shunday qilib sof foyda haqiqiy savdo va xarajatlarni ko'rsatadi, qarz esa alohida nazoratda turadi. Shuningdek, xarid ham to'g'ridan-to'g'ri xarajat emas: tovar sotilganda uning tannarxi "sotilgan tovar tannarxi" sifatida foydadan ayriladi.

Tannarx **o'rtacha** bo'yicha olinadi: masalan, 100 dona 5 000 so'mdan, keyin 50 dona jami 280 000 so'mga olsangiz, bir dona tannarxi (100 × 5 000 + 280 000) / 150 = 5 200 so'm bo'ladi.

## 9. Tez-tez uchraydigan savollar

**Savdoni bajarib bo'lmayapti, nega?** Tanlangan joyda tovar yetarli emas. Xabarda qaysi qator ekani ko'rsatilgan. Miqdorni kamaytiring, boshqa joyni tanlang yoki avval xaridni bajaring.

**Bajarilgan hujjatda xato bor.** Bajarilgan hujjatni o'zgartirib bo'lmaydi (hisob tarixi buzilmasligi uchun). Xatoni tuzatish uchun sanash (inventarizatsiya) yoki to'g'rilovchi yozuv kiriting.

**"Blokda (dona)" ni o'zgartira olmayapman.** Mahsulotda allaqachon harakat bor. Qiymatni oldindan to'g'ri kiriting.

**Ombor o'chmayapti.** Uning ichida joylar yoki tovar bor. Avval ularni bo'shating.

**Kassa qizil.** Manfiy qoldiq, odatda boshlang'ich kassa yoki biror kirim yozilmagan. 3.4 va 7-bo'limlarga qarang.

**Hisobotda raqam yo'q.** Hisobotda faqat bajarilgan hujjatlar bor va ular tanlangan davrga tushishi kerak. Davrni tekshiring va qoralamalarni bajaring.

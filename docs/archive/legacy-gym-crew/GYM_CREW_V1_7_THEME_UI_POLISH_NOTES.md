# Gym Crew v1.7 — Light/Dark Theme & UI Polish

## الهدف

التحديث ده بيضيف وضع فاتح ووضع داكن حقيقيين، ويعيد ترتيب طبقة التصميم العامة عشان التطبيق يبقى أوضح، أوسع، وأريح للعين على الموبايل والديسكتوب، مع عناية خاصة بالموبايلات القديمة وعرض 320px.

## أهم التعديلات

### الوضع الفاتح والداكن

- إضافة Theme Provider بدون مكتبات إضافية.
- اختيار Light أو Dark من الهيدر، شاشة الدخول، وإعدادات الحساب.
- حفظ الاختيار على الجهاز وعدم ظهور فلاش بلون غلط عند فتح التطبيق.
- تحديث لون شريط المتصفح و`color-scheme` تلقائيًا.
- Light Mode جديد بخلفية هادية، كروت بيضاء، حدود واضحة، وظلال خفيفة.
- Dark Mode محافظ على هوية Gym Crew مع تحسين التباين والمساحات.
- العربي والإنجليزي شغالين مع الوضعين وRTL/LTR كما هما.

### تحسين الـUI العام

- توحيد الكروت، الأزرار، الحقول، الـchips، النوافذ، والهيدر على Design Tokens واحدة.
- توسيع مساحة المحتوى من `max-w-5xl` إلى `max-w-6xl` مع Padding مريح.
- تحسين الـDashboard، Workout، Progress، Profile، Body Map، Privacy، وSplit Setup في الوضع الفاتح.
- إعادة تصميم Auth Shell وSidebar وBottom Navigation بشكل أنظف.
- توحيد الـFocus states والـTouch targets وتحسين وضوح النصوص الثانوية.
- إعادة تصميم Rest Timer للوضعين مع الحفاظ على الصوت والاهتزاز والمنطق الحالي.

### إصلاحات الموبايلات القديمة

- دعم ثابت من عرض 320px.
- منع العناصر والصور والنصوص من الخروج خارج الشاشة.
- تقليل أحجام أدوات الهيدر والـBottom Navigation على الشاشات الضيقة جدًا.
- Safe Area للآيفون وFallback للمتصفحات التي لا تدعم `dvh` أو `backdrop-filter` أو `overflow: clip`.
- منع Zoom تلقائي عند فتح حقول الإدخال على iPhone.
- جعل نافذة الاستيراد والـStarter Plans والـTimer قابلة للتمرير بأمان على الشاشات القصيرة.
- تحويل صف مراجعة التمارين المستوردة إلى عمودين على الموبايل بدل ضغط 3 حقول جنب بعض.
- الإحصائيات ذات 3 أعمدة تتحول لقائمة مريحة على الشاشات الأقل من 360px.

### قائمة تحريك وحذف التمارين

- إصلاح قائمة `طلّع لفوق / نزّل لتحت / شيل` حتى لا تخرج خارج الشاشة.
- على الموبايل: الأوامر تظهر كأزرار ثابتة داخل كارت التمرين بدل Dropdown طاير.
- على الشاشات الأكبر: القائمة تفتح من الناحية الصحيحة وتلتزم بعرض الشاشة.
- أهداف السِتات والعدات تتحول لعمود واحد على 320px ثم 3 أعمدة من 360px.

## الملفات الجديدة

- `src/contexts/theme-context.tsx`
- `src/components/theme/ThemeSwitcher.tsx`

## قاعدة البيانات

لا يوجد Supabase migration في التحديث ده.

## طريقة التركيب

ضع ملف الباتش بجوار `package.json` ثم:

```bat
git apply --check gym-crew-v1.7-theme-ui-polish.patch
git apply gym-crew-v1.7-theme-ui-polish.patch
npm install
npm run typecheck
npm run lint
rmdir /s /q .next 2>nul
npm run build
npm run dev
```

لا تشغّل:

```bat
npx supabase db push
```

## اختبار يدوي مقترح

1. بدّل بين Light وDark من الهيدر ثم اعمل Refresh.
2. بدّل اللغة عربي/English في الوضعين.
3. جرّب صفحات Home وSplit وWorkout وProgress وGroup وProfile.
4. افتح Split على عرض 320px وجرّب طلّع/نزّل/شيل.
5. افتح الكيبورد وتأكد إن الـBottom Navigation اختفت.
6. افتح Rest Timer وجرب الصوت والـPause و`+15/-15`.
7. افتح Import Wizard على موبايل قديم أو DevTools بعرض 320px.

## التحقق

- `npm run typecheck`: Passed
- `npm run lint`: Passed
- Next.js compilation and static generation: Passed (36/36 pages)
- بيئة التجهيز توقفت عند `Collecting build traces` بسبب مهلة التشغيل، لذلك تشغيل `npm run build` على جهاز المشروع هو خطوة الاعتماد النهائية قبل الـPush.

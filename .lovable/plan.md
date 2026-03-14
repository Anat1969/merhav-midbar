

## תוכנית: מעבר לרקע לבן בכל הדפים

### סקירה
המערכת כרגע בנויה על ערכת צבעים כהה (רקע כחול-כהה #0A1628, כרטיסים #162B55, טקסט לבן). נעביר את כל הדפים לרקע לבן עם טקסט כהה, תוך שמירה על הצבעים המזהים (זהב #C9A84C, טורקיז #2C6E6A).

### שינויים

**1. משתני CSS — `src/index.css`**
עדכון כל משתני ה-root לערכת צבעים בהירה:
- `--background`: לבן
- `--foreground`: כהה (#1a1a1a)
- `--card`: לבן
- `--card-foreground`: כהה
- `--secondary`: אפור בהיר (#F5F5F5)
- `--muted`: אפור בהיר
- `--muted-foreground`: אפור (#6B7280)
- `--border`: אפור בהיר (#E5E7EB)
- `--popover`: לבן
- עדכון scrollbar ו-activity-log borders בהתאם

**2. TopNav — `src/components/TopNav.tsx`**
- רקע הניווט: לבן עם border תחתון אפור
- טקסט: כהה במקום לבן
- כפתורים: border אפור, hover אפור בהיר
- שם האתר: נשאר זהב
- Mobile drawer: רקע לבן

**3. HeroBanner — `src/components/HeroBanner.tsx`**
- gradient כהה → gradient עדין בגוני זהב/טורקיז או רקע בהיר עם border
- טקסט: כהה/אפור במקום לבן

**4. PlanInstructionsListPage — `src/pages/PlanInstructionsListPage.tsx`**
- `bg-background` כבר משתמש במשתנה — יתעדכן אוטומטית
- input search: עדכון border ו-bg

**5. דפים נוספים שמשתמשים ב-`bg-background`**
הדפים הבאים ישתנו אוטומטית דרך המשתנה: Index, DomainPage, PlanInstructionsPage, BinuiPage, GenericDomainPage, ועוד.

**6. קבצים עם צבעים hardcoded**
- `TopNav.tsx`: החלפת `bg-[#0A1628]`, `border-[#1E3A6E]`, `text-white`, `hover:bg-[#162B55]`
- `HeroBanner.tsx`: החלפת gradient ו-`text-[#B8C5D6]`

**7. Tailwind config — `tailwind.config.ts`**
- עדכון צבעי navyDeep/navyMid/navyCard/navyBorder לגרסאות בהירות

### מה נשמר
- צבע זהב (#C9A84C) לכותרות ואקסנטים
- צבעי סטטוס (ירוק, כתום, אדום)
- צבעי דומיין (טורקיז #2C6E6A וכו')
- Stage badges


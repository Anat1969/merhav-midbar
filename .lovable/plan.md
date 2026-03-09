
## תוכנית: שימוש בקישור תצוגה (viewLink) בכפתורי הדשבורד

### הבעיה
כרגע כפתורי האפליקציות בדשבורד פותחים את `app.link` (קישור עבודה/עריכה) במקום `app.viewLink` (קישור תצוגה/אפליקציה חיה).

### הפתרון
עדכון `SubIconsRow` בקובץ `AppIconsBar.tsx`:
- שינוי הקריאה ל-`openExternalLink` לשימוש ב-`viewLink` כברירת מחדל
- fallback ל-`link` אם אין viewLink
- הצגת הכפתור רק אם יש קישור כלשהו

### שינוי טכני
```typescript
// שורה 105 - שינוי מ:
openExternalLink(app.link);

// ל:
openExternalLink(app.viewLink || app.link);
```

בנוסף, סינון אפליקציות ללא קישור תצוגה כדי להציג רק אפליקציות עם viewLink.

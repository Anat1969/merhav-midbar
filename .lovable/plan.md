

## תוכנית: הוספת לוגים של צריכת טוקנים

### מה נעשה
נעדכן את ה-Edge Function `parse-plan-instructions` כך שירשום ללוג את מספר הטוקנים שנצרכו בכל ניתוח.

### שינויים טכניים

**קובץ: `supabase/functions/parse-plan-instructions/index.ts`**

לאחר קבלת התגובה מ-AI Gateway, נוסיף לוג שמדפיס את פרטי ה-usage:

```typescript
const aiData = JSON.parse(aiText);

// Log token usage
if (aiData.usage) {
  console.log("Token usage:", JSON.stringify({
    prompt_tokens: aiData.usage.prompt_tokens,
    completion_tokens: aiData.usage.completion_tokens,
    total_tokens: aiData.usage.total_tokens,
    model: aiData.model
  }));
}
```

### תוצאה
בפעם הבאה שתנתח הוראות תוכנית, הלוגים יציגו את מספר הטוקנים שנצרכו.


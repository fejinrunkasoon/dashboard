import { sub, eachDayOfInterval, format } from 'date-fns'
import type { ConsumptionRecord, Media } from '~/types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Number(query.days) || 30

  const range = {
    start: sub(new Date(), { days }),
    end: new Date()
  }

  const dates = eachDayOfInterval(range)
  const medias: Media[] = ['Meta', 'Google', 'TikTok']

  const records: ConsumptionRecord[] = []

  let idCounter = 1
  for (const date of dates) {
    for (const media of medias) {
      const baseAmount = media === 'Meta' ? 8000 : media === 'Google' ? 5000 : 3000
      const variance = Math.floor(Math.random() * baseAmount * 0.4)
      const amount = baseAmount + variance - Math.floor(baseAmount * 0.2)

      records.push({
        id: idCounter++,
        accountId: `daily_${media.toLowerCase()}`,
        date: format(date, 'yyyy-MM-dd'),
        amount,
        media
      })
    }
  }

  return records
})
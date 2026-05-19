const datePicker = {
  selectedDate: new Date(2025, 7, 17),
  visibleMonth: 7,
  visibleYear: 2025,
}

const selectedButtonClasses = ['bg-purple-600', 'text-white', 'shadow-md']
const dayButtonClasses = [
  'w-8',
  'h-8',
  'mx-auto',
  'rounded-full',
  'hover:bg-purple-100',
  'transition',
]

function fillYearOptions() {
  const yearSelect = document.getElementById('calendar-year-select')
  const firstYear = datePicker.visibleYear - 10
  const lastYear = datePicker.visibleYear + 10

  yearSelect.innerHTML = ''

  for (let year = firstYear; year <= lastYear; year++) {
    const option = document.createElement('option')

    option.value = year
    option.textContent = year
    yearSelect.appendChild(option)
  }
}

function formatDateForScreen(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${month}/${day}/${date.getFullYear()}`
}

function formatDateForInput(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function parseDateFromText(value) {
  const cleanValue = value.trim()
  const slashDate = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const dashDate = cleanValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

  if (!slashDate && !dashDate) {
    return null
  }

  const year = slashDate ? Number(slashDate[3]) : Number(dashDate[1])
  const month = slashDate ? Number(slashDate[1]) - 1 : Number(dashDate[2]) - 1
  const day = slashDate ? Number(slashDate[2]) : Number(dashDate[3])
  const date = new Date(year, month, day)

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }

  return date
}

function isSameDate(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )
}

function createMutedDay(day) {
  const dayElement = document.createElement('span')
  dayElement.className = 'text-gray-300'
  dayElement.textContent = day

  return dayElement
}

function createActiveDay(day) {
  const dayButton = document.createElement('button')
  const date = new Date(datePicker.visibleYear, datePicker.visibleMonth, day)

  dayButton.type = 'button'
  dayButton.textContent = day
  dayButton.classList.add(...dayButtonClasses)

  if (isSameDate(date, datePicker.selectedDate)) {
    dayButton.classList.add(...selectedButtonClasses)
    dayButton.classList.remove('hover:bg-purple-100')
  }

  dayButton.addEventListener('click', () => {
    datePicker.selectedDate = date
    syncSelectedDate()
    renderCalendar()
  })

  return dayButton
}

function syncSelectedDate() {
  const selectedDateLabel = document.getElementById('selected-date-label')
  const serviceDateInput = document.getElementById('service-date-input')

  selectedDateLabel.value = formatDateForScreen(datePicker.selectedDate)
  serviceDateInput.value = formatDateForInput(datePicker.selectedDate)
}

function renderCalendar() {
  const calendarDays = document.getElementById('calendar-days')
  const monthSelect = document.getElementById('calendar-month-select')
  const yearSelect = document.getElementById('calendar-year-select')
  const firstDayOfMonth = new Date(datePicker.visibleYear, datePicker.visibleMonth, 1).getDay()
  const daysInMonth = new Date(datePicker.visibleYear, datePicker.visibleMonth + 1, 0).getDate()
  const daysInPreviousMonth = new Date(datePicker.visibleYear, datePicker.visibleMonth, 0).getDate()
  const totalCalendarCells = 42

  calendarDays.innerHTML = ''
  fillYearOptions()
  monthSelect.value = datePicker.visibleMonth
  yearSelect.value = datePicker.visibleYear

  for (let index = firstDayOfMonth - 1; index >= 0; index--) {
    calendarDays.appendChild(createMutedDay(daysInPreviousMonth - index))
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.appendChild(createActiveDay(day))
  }

  const remainingCells = totalCalendarCells - calendarDays.children.length

  for (let day = 1; day <= remainingCells; day++) {
    calendarDays.appendChild(createMutedDay(day))
  }
}

function changeVisibleMonth(direction) {
  const newDate = new Date(datePicker.visibleYear, datePicker.visibleMonth + direction, 1)

  datePicker.visibleMonth = newDate.getMonth()
  datePicker.visibleYear = newDate.getFullYear()

  renderCalendar()
}

function updateDateFromText() {
  const selectedDateLabel = document.getElementById('selected-date-label')
  const typedValue = selectedDateLabel.value.trim()

  if (
    typedValue === formatDateForScreen(datePicker.selectedDate) ||
    typedValue === formatDateForInput(datePicker.selectedDate)
  ) {
    syncSelectedDate()
    return
  }

  const typedDate = parseDateFromText(selectedDateLabel.value)

  if (!typedDate) {
    syncSelectedDate()
    return
  }

  datePicker.selectedDate = typedDate
  datePicker.visibleMonth = typedDate.getMonth()
  datePicker.visibleYear = typedDate.getFullYear()

  syncSelectedDate()
  renderCalendar()
}

document.addEventListener('DOMContentLoaded', () => {
  const datePickerToggle = document.getElementById('date-picker-toggle')
  const datePickerButton = document.getElementById('date-picker-button')
  const selectedDateLabel = document.getElementById('selected-date-label')
  const datePickerPanel = document.getElementById('date-picker-panel')
  const monthSelect = document.getElementById('calendar-month-select')
  const yearSelect = document.getElementById('calendar-year-select')
  const previousMonthButton = document.getElementById('previous-month-button')
  const nextMonthButton = document.getElementById('next-month-button')
  const cancelDateButton = document.getElementById('cancel-date-button')
  const acceptDateButton = document.getElementById('accept-date-button')

  syncSelectedDate()
  renderCalendar()

  const toggleDatePicker = () => {
    datePickerPanel.classList.toggle('hidden')
  }

  datePickerToggle.addEventListener('click', toggleDatePicker)

  datePickerButton.addEventListener('click', (event) => {
    event.stopPropagation()
    toggleDatePicker()
  })

  selectedDateLabel.addEventListener('click', (event) => {
    event.stopPropagation()
    datePickerPanel.classList.remove('hidden')
  })

  selectedDateLabel.addEventListener('blur', updateDateFromText)
  selectedDateLabel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      updateDateFromText()
      datePickerPanel.classList.add('hidden')
      selectedDateLabel.blur()
    }
  })

  monthSelect.addEventListener('change', () => {
    datePicker.visibleMonth = Number(monthSelect.value)
    renderCalendar()
  })

  yearSelect.addEventListener('change', () => {
    datePicker.visibleYear = Number(yearSelect.value)
    renderCalendar()
  })

  previousMonthButton.addEventListener('click', () => changeVisibleMonth(-1))
  nextMonthButton.addEventListener('click', () => changeVisibleMonth(1))

  cancelDateButton.addEventListener('click', () => {
    datePicker.visibleMonth = datePicker.selectedDate.getMonth()
    datePicker.visibleYear = datePicker.selectedDate.getFullYear()
    datePickerPanel.classList.add('hidden')
    renderCalendar()
  })

  acceptDateButton.addEventListener('click', () => {
    datePickerPanel.classList.add('hidden')
  })
})

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../config/constants';

// Month names for formatting
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Day names for calendar header
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const DateNavigator = ({
  currentMonth,
  showCalendar,
  onToggleCalendar,
  onMonthChange,
}) => {
  // Format month and year for display
  const formatMonthYear = (date) => {
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onMonthChange(prevMonth);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    onMonthChange(nextMonth);
  };
  
  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Create date for first day of the month
    const firstDay = new Date(year, month, 1);
    // Get the day of the week (0-6, where 0 is Sunday)
    const startingDayOfWeek = firstDay.getDay();
    
    // Get the number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Generate calendar grid with days
    const days = [];
    
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  // Render calendar
  const renderCalendar = () => {
    const days = generateCalendarDays();
    const today = new Date();
    const isCurrentMonth = 
      today.getMonth() === currentMonth.getMonth() && 
      today.getFullYear() === currentMonth.getFullYear();
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousMonth}>
            <Ionicons name="chevron-back" size={20} color={COLORS.TEXT} />
          </TouchableOpacity>
          
          <Text style={styles.calendarHeaderText}>
            {formatMonthYear(currentMonth)}
          </Text>
          
          <TouchableOpacity onPress={goToNextMonth}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.daysHeader}>
          {DAYS.map((day, index) => (
            <Text key={index} style={styles.dayHeaderText}>
              {day}
            </Text>
          ))}
        </View>
        
        <View style={styles.daysGrid}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isCurrentMonth && day === today.getDate() && styles.todayCell,
              ]}
              onPress={() => {
                if (day) {
                  const selectedDate = new Date(currentMonth);
                  selectedDate.setDate(day);
                  onMonthChange(selectedDate);
                }
              }}
              disabled={!day}
            >
              {day && (
                <Text style={[
                  styles.dayText,
                  isCurrentMonth && day === today.getDate() && styles.todayText,
                ]}>
                  {day}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.calendarFooter}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={onToggleCalendar}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onToggleCalendar}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.dateSelector}
        onPress={onToggleCalendar}
      >
        <Ionicons name="calendar-outline" size={18} color={COLORS.TEXT} style={styles.calendarIcon} />
        <Text style={styles.dateSelectorText}>{formatMonthYear(currentMonth)}</Text>
        <Ionicons name={showCalendar ? "chevron-up" : "chevron-down"} size={16} color={COLORS.TEXT} />
      </TouchableOpacity>
      
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={onToggleCalendar}
      >
        <TouchableWithoutFeedback onPress={onToggleCalendar}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {renderCalendar()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER || '#E5E5E5',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  calendarIcon: {
    marginRight: 8,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT || '#121212',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.BACKGROUND || '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  calendarContainer: {
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT || '#121212',
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY || '#646464',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayCell: {
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.TEXT || '#121212',
  },
  todayText: {
    color: COLORS.WHITE || '#FFFFFF',
    fontWeight: 'bold',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  applyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.PRIMARY || '#2B68E6',
    borderRadius: 4,
    marginLeft: 8,
  },
  applyButtonText: {
    color: COLORS.WHITE || '#FFFFFF',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: COLORS.TEXT || '#121212',
  },
});

export default DateNavigator;

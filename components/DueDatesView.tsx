import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTodoStore } from '../store/todoStore';

export default function DueDatesView() {
  const getAllTodosWithDueDates = useTodoStore(
    (state) => state.getAllTodosWithDueDates
  );
  const toggleTodo = useTodoStore((state) => state.toggleTodo);

  const todosWithDueDates = getAllTodosWithDueDates();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderTodoItem = ({ item }: { item: any }) => {
    const isOverdue = new Date(item.dueDate!) < new Date() && !item.completed;

    return (
      <Pressable
        style={[
          styles.todoItem,
          item.completed && styles.completedTodo,
          isOverdue && styles.overdueTodo,
        ]}
        onPress={() => {
          const list = useTodoStore
            .getState()
            .lists.find((l) => l.items.some((i) => i.id === item.id));
          if (list) {
            toggleTodo(list.id, item.id);
          }
        }}
      >
        <View style={styles.todoContent}>
          <Text
            style={[styles.todoText, item.completed && styles.completedText]}
          >
            {item.text}
          </Text>
          <Text style={styles.listName}>{item.listName}</Text>
        </View>
        <View style={styles.dueDateContainer}>
          <Text style={[styles.dueDate, isOverdue && styles.overdueDateText]}>
            {formatDate(item.dueDate!)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Due Dates</Text>
      {todosWithDueDates.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No todos with due dates</Text>
        </View>
      ) : (
        <FlatList
          data={todosWithDueDates}
          renderItem={renderTodoItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 10,
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  todoItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedTodo: {
    backgroundColor: '#e8f5e8',
  },
  overdueTodo: {
    backgroundColor: '#ffebee',
  },
  todoContent: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  listName: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  dueDateContainer: {
    marginLeft: 10,
  },
  dueDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  overdueDateText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
});

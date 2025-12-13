"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import TodoItem from "./TodoItem";
import { Plus } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState<string>("");

  const addTodo = () => {
    if (newTodoText.trim() === "") {
      showError("Todo text cannot be empty!");
      return;
    }
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
    };
    setTodos((prevTodos) => [...prevTodos, newTodo]);
    setNewTodoText("");
    showSuccess("Todo added successfully!");
  };

  const toggleTodo = (id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
    showSuccess("Todo status updated!");
  };

  const deleteTodo = (id: string) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
    showSuccess("Todo deleted!");
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      addTodo();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">My Todo List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-6">
          <Input
            type="text"
            placeholder="Add a new todo..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-grow h-12 text-base"
          />
          <Button onClick={addTodo} className="h-12 px-6 text-base">
            <Plus className="mr-2 h-5 w-5" /> Add
          </Button>
        </div>
        {todos.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg py-8">No todos yet! Add one above.</p>
        ) : (
          <ScrollArea className="h-[300px] w-full rounded-md border">
            <div>
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  {...todo}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default TodoList;
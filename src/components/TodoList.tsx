"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import TodoItem from "./TodoItem";
import { Plus } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type Filter = "all" | "active" | "completed";

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    // Load todos from local storage on initial render
    if (typeof window !== "undefined") {
      const savedTodos = localStorage.getItem("todos");
      return savedTodos ? JSON.parse(savedTodos) : [];
    }
    return [];
  });
  const [newTodoText, setNewTodoText] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("all");

  // Save todos to local storage whenever the todos state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
  }, [todos]);

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

  const clearCompleted = () => {
    setTodos((prevTodos) => prevTodos.filter((todo) => !todo.completed));
    showSuccess("Completed todos cleared!");
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      addTodo();
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") {
      return !todo.completed;
    }
    if (filter === "completed") {
      return todo.completed;
    }
    return true; // "all" filter
  });

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
        {filteredTodos.length === 0 && todos.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg py-8">No todos yet! Add one above.</p>
        ) : filteredTodos.length === 0 && todos.length > 0 ? (
          <p className="text-center text-muted-foreground text-lg py-8">No {filter} todos.</p>
        ) : (
          <ScrollArea className="h-[300px] w-full rounded-md border">
            <div>
              {filteredTodos.map((todo) => (
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
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t">
        <ToggleGroup type="single" value={filter} onValueChange={(value: Filter) => value && setFilter(value)} className="w-full sm:w-auto justify-center">
          <ToggleGroupItem value="all" aria-label="Show all todos">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="active" aria-label="Show active todos">
            Active
          </ToggleGroupItem>
          <ToggleGroupItem value="completed" aria-label="Show completed todos">
            Completed
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          onClick={clearCompleted}
          variant="outline"
          className="w-full sm:w-auto"
          disabled={!todos.some(todo => todo.completed)}
        >
          Clear Completed
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TodoList;
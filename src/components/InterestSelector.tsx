
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  name: string;
  category: string | null;
}

interface InterestSelectorProps {
  onComplete: (selectedInterests: string[]) => void;
  placeholder?: string;
  minSelections?: number;
  type?: 'activities' | 'food' | 'music';
  value?: string[];
  onChange?: (selections: string[]) => void;
}

export const InterestSelector = ({ 
  onComplete,
  minSelections = 1,
  placeholder = "Type to search activities...",
  type = 'activities',
  value = [],
  onChange
}: InterestSelectorProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const getTableName = () => {
    switch (type) {
      case 'food':
        return 'food_items';
      case 'music':
        return 'music_genres';
      default:
        return 'activities';
    }
  };

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from(getTableName())
        .select('*')
        .order('name');
      
      if (error) {
        toast({
          title: `Error fetching ${type}`,
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setItems(data);
    };

    fetchItems();
  }, [type, toast]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems([]);
    }
  }, [searchTerm, items]);

  const handleItemSelect = (itemName: string) => {
    const newSelectedItems = value.includes(itemName)
      ? value.filter(name => name !== itemName)
      : [...value, itemName];
    
    onChange?.(newSelectedItems);
    onComplete(newSelectedItems);
    setSearchTerm("");
    setFilteredItems([]);
  };

  const validateItemName = (name: string): boolean => {
    const sqlPatterns = [
      /(\b(select|insert|update|delete|drop|union|exec|declare|alter)\b)|(--)|(;)|(\/\*|\*\/)|(')/gi,
      /(\b(table|database|schema)\b)/gi,
      /(\b(waitfor|delay|sleep)\b)/gi
    ];

    return !sqlPatterns.some(pattern => pattern.test(name));
  };

  const createNewItem = async (name: string) => {
    if (!validateItemName(name)) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid name without special characters",
        variant: "destructive",
      });
      return null;
    }

    const sanitizedName = name.replace(/[^a-zA-Z0-9\s\-_.,!?]/g, '').trim();
    
    if (sanitizedName !== name) {
      toast({
        title: "Name modified",
        description: "Some special characters were removed for security",
        variant: "default",
      });
    }

    const { data, error } = await supabase
      .from(getTableName())
      .insert({ name: sanitizedName })
      .select()
      .single();

    if (error) {
      toast({
        title: `Error creating ${type} item`,
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setItems(prev => [...prev, data]);
    return data;
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const inputValue = searchTerm.trim();
      if (!inputValue) return;

      const newItems = inputValue.split(',').map(act => act.trim()).filter(Boolean);

      for (const itemName of newItems) {
        if (!itemName) continue;

        const existingItem = items.find(
          a => a.name.toLowerCase() === itemName.toLowerCase()
        );

        if (existingItem) {
          if (!value.includes(existingItem.name)) {
            const newSelectedItems = [...value, existingItem.name];
            onChange?.(newSelectedItems);
            onComplete(newSelectedItems);
          }
        } else {
          const newItem = await createNewItem(itemName);
          if (newItem) {
            const newSelectedItems = [...value, newItem.name];
            onChange?.(newSelectedItems);
            onComplete(newSelectedItems);
          }
        }
      }

      setSearchTerm("");
      setFilteredItems([]);
    }
  };

  const handleSubmit = () => {
    onComplete(value);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="text-xl font-cormorant"
          onKeyDown={handleInputKeyDown}
        />
        <p className="text-sm text-gray-500 pl-1">Press Enter to add an interest. Add as many as you like.</p>
      </div>
      
      {filteredItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
          {filteredItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start text-xl font-cormorant"
              onClick={() => handleItemSelect(item.name)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <Button
            key={item}
            variant="secondary"
            onClick={() => handleItemSelect(item)}
            className="group text-xl font-cormorant"
          >
            {item}
            <span className="ml-2 opacity-0 group-hover:opacity-100">×</span>
          </Button>
        ))}
      </div>

      {value.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-xl font-cormorant text-gray-500">
            {value.length} selected (minimum {minSelections})
          </p>
        </div>
      )}
    </div>
  );
};

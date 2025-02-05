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
  initialSelections?: string[];
  type?: 'activities' | 'food' | 'music';
}

export const InterestSelector = ({ 
  onComplete, 
  placeholder = "Type to search or add new activities...",
  minSelections = 1,
  initialSelections = [],
  type = 'activities'
}: InterestSelectorProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>(initialSelections);
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

  // Fetch items on mount and when type changes
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

  // Filter items when search term changes
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
    const newSelectedItems = selectedItems.includes(itemName)
      ? selectedItems.filter(name => name !== itemName)
      : [...selectedItems, itemName];
    
    setSelectedItems(newSelectedItems);
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
          if (!selectedItems.includes(existingItem.name)) {
            const newSelectedItems = [...selectedItems, existingItem.name];
            setSelectedItems(newSelectedItems);
            onComplete(newSelectedItems);
          }
        } else {
          const newItem = await createNewItem(itemName);
          if (newItem) {
            const newSelectedItems = [...selectedItems, newItem.name];
            setSelectedItems(newSelectedItems);
            onComplete(newSelectedItems);
          }
        }
      }

      setSearchTerm("");
      setFilteredItems([]);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
      />
      
      {filteredItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
          {filteredItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleItemSelect(item.name)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {selectedItems.map((item) => (
          <Button
            key={item}
            variant="secondary"
            onClick={() => handleItemSelect(item)}
            className="group"
          >
            {item}
            <span className="ml-2 opacity-0 group-hover:opacity-100">×</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
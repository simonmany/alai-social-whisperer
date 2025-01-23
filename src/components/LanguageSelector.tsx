import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Language {
  id: string;
  name: string;
}

interface LanguageSelectorProps {
  onComplete: (selectedLanguages: string[]) => void;
  minSelections?: number;
}

export const LanguageSelector = ({ 
  onComplete,
  minSelections = 1
}: LanguageSelectorProps) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLanguages = async () => {
      const { data, error } = await supabase
        .from('languages')
        .select('*')
        .order('name');
      
      if (error) {
        toast({
          title: "Error fetching languages",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setLanguages(data);
    };

    fetchLanguages();
  }, [toast]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = languages.filter(language =>
        language.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages([]);
    }
  }, [searchTerm, languages]);

  const handleLanguageSelect = (languageName: string) => {
    if (selectedLanguages.includes(languageName)) {
      setSelectedLanguages(prev => prev.filter(name => name !== languageName));
    } else {
      setSelectedLanguages(prev => [...prev, languageName]);
    }
    setSearchTerm("");
    setFilteredLanguages([]);
  };

  const handleSubmit = () => {
    if (selectedLanguages.length < minSelections) {
      toast({
        title: `Please select at least ${minSelections} language`,
        description: `You've selected ${selectedLanguages.length} so far`,
        variant: "destructive",
      });
      return;
    }
    onComplete(selectedLanguages);
  };

  return (
    <div className="space-y-4">
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Type to search languages..."
      />
      
      {filteredLanguages.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
          {filteredLanguages.map((language) => (
            <Button
              key={language.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleLanguageSelect(language.name)}
            >
              {language.name}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {selectedLanguages.map((language) => (
          <Button
            key={language}
            variant="secondary"
            onClick={() => handleLanguageSelect(language)}
            className="group"
          >
            {language}
            <span className="ml-2 opacity-0 group-hover:opacity-100">×</span>
          </Button>
        ))}
      </div>

      {selectedLanguages.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {selectedLanguages.length} selected (minimum {minSelections})
          </p>
          <Button onClick={handleSubmit}>Continue</Button>
        </div>
      )}
    </div>
  );
};
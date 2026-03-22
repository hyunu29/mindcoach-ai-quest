import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ChevronRight, Clock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Test {
  id: string;
  name: string;
  category: string;
  category_label: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  is_ai_recommended: boolean;
}

const categories = [
  { key: "all", label: "전체" },
  { key: "A", label: "A: 비교불안·SNS" },
  { key: "B", label: "B: 번아웃·분노" },
  { key: "C", label: "C: 긴장·수면" },
  { key: "D", label: "D: 자기효능감" },
  { key: "E", label: "E: 시험불안·집중" },
];

export default function TestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const fetchTests = async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, name, category, category_label, description, question_count, duration_minutes, is_ai_recommended")
        .order("is_ai_recommended", { ascending: false });

      if (!error && data) setTests(data);
      setLoading(false);
    };
    fetchTests();
  }, []);

  const filtered = activeCategory === "all"
    ? tests
    : tests.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-5 animate-reveal-up">
      <div>
        <h1 className="text-2xl font-bold">심리검사 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">나에게 맞는 검사를 선택해 보세요.</p>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeCategory === cat.key
                ? "gradient-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Test cards grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          해당 카테고리의 검사가 아직 없어요.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((test) => (
            <Card
              key={test.id}
              className="p-5 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98] relative"
              onClick={() => navigate(`/tests/${test.id}`)}
            >
              {test.is_ai_recommended && (
                <div className="absolute top-3 right-3">
                  <Badge className="gradient-primary text-primary-foreground text-[10px] px-2 py-0.5 border-0 gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI 추천
                  </Badge>
                </div>
              )}

              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 pr-12">
                  <h3 className="font-bold text-sm">{test.name}</h3>
                  <Badge variant="outline" className="text-[10px] mt-1 font-medium">
                    {test.category_label}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                {test.description}
              </p>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  {test.question_count}문항
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  약 {test.duration_minutes}분
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

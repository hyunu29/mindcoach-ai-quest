import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, ChevronRight, Clock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TestRow {
  id: string;
  name: string;
  category: string;
  related_syndrome: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  is_recommended: boolean;
  is_coming_soon: boolean;
  subdomains: string[];
  questions: unknown[];
}

const categoryFilters = [
  { id: "all", label: "전체" },
  { id: "A", label: "A: 비교불안·SNS" },
  { id: "B", label: "B: 번아웃·분노" },
  { id: "C", label: "C: 긴장·수면" },
  { id: "D", label: "D: 효능감·미루기" },
  { id: "E", label: "E: 시험·집중력" },
];

export default function TestsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, [activeCategory]);

  const fetchTests = async () => {
    setLoading(true);
    let query = supabase
      .from("tests")
      .select("*")
      .order("is_coming_soon", { ascending: true })
      .order("category")
      .order("id");

    if (activeCategory !== "all") {
      query = query.eq("category", activeCategory);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTests(data as unknown as TestRow[]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5 animate-reveal-up">
      <div>
        <h1 className="text-2xl font-bold">심리검사 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">나에게 맞는 검사를 선택해 보세요.</p>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {categoryFilters.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeCategory === cat.id
                ? "gradient-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 rounded-2xl border-border/50">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-2/3 mb-3" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          해당 카테고리의 검사가 아직 없어요.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => {
            const hasQuestions = !test.is_coming_soon && Array.isArray(test.questions) && test.questions.length > 0;
            return (
              <Card
                key={test.id}
                className={`p-5 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98] relative ${
                  !hasQuestions ? "opacity-60" : ""
                }`}
                onClick={() => hasQuestions && navigate(`/tests/${test.id}`)}
              >
                {test.is_recommended && (
                  <div className="absolute top-3 right-3">
                    <Badge className="gradient-primary text-primary-foreground text-[10px] px-2 py-0.5 border-0 gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI 추천
                    </Badge>
                  </div>
                )}

                {test.is_coming_soon && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      준비중
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
                      {test.category}: {test.related_syndrome}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                  {test.description}
                </p>

                <div className="flex items-center justify-between">
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
                  {hasQuestions && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

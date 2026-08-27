import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash,
  HelpCircle,
  LayoutGrid,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  _id: string;
  title: string;
  options: string[];
  answer: string;
  category: string;
  createdAt: string;
}

export default function QuestionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    options: ["", ""],
    answer: "",
    category: "General",
  });

  const queryClient = useQueryClient();

  // Fetch Questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const res = await api.get("/questions");
      return res.data.data as Question[];
    },
  });

  // Create/Update Mutation
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingQuestion) {
        return api.put(`/questions/${editingQuestion._id}`, data);
      }
      return api.post("/questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success(editingQuestion ? "Question updated" : "Question created");
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question deleted");
    },
  });

  const handleOpenModal = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        title: question.title,
        options: [...question.options],
        answer: question.answer,
        category: question.category,
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        title: "",
        options: ["", ""],
        answer: "",
        category: "General",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ""] });
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData({ ...formData, options: newOptions });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.title ||
      !formData.answer ||
      formData.options.some((o) => !o)
    ) {
      toast.error("Please fill all fields");
      return;
    }
    mutation.mutate(formData);
  };

  const filteredQuestions = questions?.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="admin-page animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 bg-white -mx-6 -mt-6 p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Question System
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Syncing knowledge across the platform
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="h-8.5 px-4 rounded-[4px] font-semibold text-xs bg-primary-orange hover:bg-primary-orange/90 text-white flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={16} /> Add New Question
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            placeholder="Search by title, category, or options..."
            className="w-full pl-9 pr-4 h-8.5 bg-slate-50 rounded-[4px] border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-md p-5 border border-slate-200 shadow-sm h-[260px] animate-pulse"
            >
              <div className="h-4 w-20 bg-slate-100 rounded mb-4" />
              <div className="h-6 w-full bg-slate-100 rounded mb-6" />
              <div className="space-y-2">
                <div className="h-9 w-full bg-slate-50 rounded" />
                <div className="h-9 w-full bg-slate-50 rounded" />
              </div>
            </div>
          ))
        ) : filteredQuestions?.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-md border border-dashed border-slate-200 shadow-sm">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              No questions found
            </p>
          </div>
        ) : (
          filteredQuestions?.map((q) => (
            <motion.div
              layout
              key={q._id}
              className="bg-white rounded-md p-5 border border-slate-200 shadow-sm flex flex-col group hover:border-[#FF4D00]/30 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <Badge
                  variant="secondary"
                  className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-wider"
                >
                  {q.category}
                </Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(q)}
                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-[#FF4D00] hover:bg-[#FF4D00]/10 rounded-[4px] transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this question?"))
                        deleteMutation.mutate(q._id);
                    }}
                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] transition-colors"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-4 leading-snug flex-grow">
                {q.title}
              </h3>

              <div className="space-y-1.5 mb-4">
                {q.options.slice(0, 3).map((opt, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2.5 rounded-[4px] border flex justify-between items-center ${opt === q.answer ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                  >
                    <span className="truncate">{opt}</span>
                    {opt === q.answer && <CheckCircle2 size={12} />}
                  </div>
                ))}
                {q.options.length > 3 && (
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center mt-1">
                    + {q.options.length - 3} more options
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00]">
                    <HelpCircle size={13} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 leading-none">
                      Correct
                    </p>
                    <p className="text-[11px] font-bold text-green-600 truncate max-w-[120px]">
                      {q.answer}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenModal(q)}
                  className="text-slate-300 hover:text-[#FF4D00] transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-[4px] border border-slate-200 p-0 overflow-hidden shadow-sm bg-white">
          <div className="bg-slate-50 p-5 border-b border-[#E2E8F0]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#FF4D00]" />
                {editingQuestion ? "Refine Question" : "New Knowledge Entry"}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
                Configure interactive content
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Question Statement
                </Label>
                <Input
                  className="h-8.5 rounded-[4px] border-[#E2E8F0] text-xs font-medium"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="What would you like to ask?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Category
                  </Label>
                  <Input
                    className="h-8.5 rounded-[4px] border-[#E2E8F0] text-xs font-medium"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g. Adventure"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Options
                  </Label>
                  <div className="h-8.5 flex items-center px-3 bg-slate-50 rounded-[4px] text-xs font-semibold text-slate-500 border border-[#E2E8F0]">
                    {formData.options.length} Interactive Choices
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Choice Configuration
                  </Label>
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-[10px] font-bold uppercase text-[#FF4D00] tracking-wider hover:text-[#FF4D00]/80 flex items-center gap-1 transition-colors"
                  >
                    <Plus size={12} /> Add Choice
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formData.options.map((option, idx) => (
                    <div key={idx} className="relative group">
                      <Input
                        className={`h-8.5 pr-8 rounded-[4px] text-xs font-medium transition-all ${formData.answer === option && option !== "" ? "border-green-200 bg-green-50/30" : "border-[#E2E8F0]"}`}
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(idx, e.target.value)
                        }
                        placeholder={`Option ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        disabled={formData.options.length <= 2}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-600 disabled:opacity-0 transition-all"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Validated Correct Answer
                </Label>
                <div className="relative">
                  <select
                    className="w-full h-8.5 px-3 pr-8 rounded-[4px] border border-[#E2E8F0] bg-white text-xs font-semibold appearance-none focus:outline-none focus:border-[#FF4D00] transition-all"
                    value={formData.answer}
                    onChange={(e) =>
                      setFormData({ ...formData, answer: e.target.value })
                    }
                  >
                    <option value="">Select validated answer</option>
                    {formData.options
                      .filter((o) => o)
                      .map((option, idx) => (
                        <option key={idx} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <ChevronRight size={14} className="rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-[#E2E8F0]">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="flex-1 h-8.5 rounded-[4px] font-semibold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-[2] h-8.5 rounded-[4px] bg-primary-orange hover:bg-primary-orange/90 text-white font-semibold text-xs shadow-sm"
              >
                {mutation.isPending
                  ? "Synchronizing..."
                  : editingQuestion
                    ? "Update Knowledge"
                    : "Publish Entry"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, User, Brain, Clock, Tag, Trash2, Edit3, CheckCircle, Circle, Lightbulb, FileText, Settings, ChevronDown } from 'lucide-react';

const FlowMind = () => {
  // 状态管理
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [currentView, setCurrentView] = useState('login');
  const [selectedDate, setSelectedDate] = useState('');
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const taskInputRef = useRef(null);
  const ideaInputRef = useRef(null);

  // 任务标签 - 莫兰迪色系
  const taskTags = [
    { id: 'personal', name: '🏠 Personal', color: 'text-slate-600', bg: 'bg-slate-100' },
    { id: 'work', name: '💼 Work', color: 'text-stone-600', bg: 'bg-stone-100' },
    { id: 'study', name: '📚 Study', color: 'text-neutral-600', bg: 'bg-neutral-100' },
    { id: 'entertainment', name: '🎮 Entertainment', color: 'text-zinc-600', bg: 'bg-zinc-100' },
    { id: 'health', name: '🏃 Health', color: 'text-gray-600', bg: 'bg-gray-100' },
    { id: 'uncategorized', name: '📝 Other', color: 'text-slate-500', bg: 'bg-slate-50' }
  ];

  // 修复后的AI智能解析任务
  const parseTaskInput = (input) => {
    // 支持分号或换行符分隔
    const lines = input.split(/[;\n]/).filter(line => line.trim());
    const parsedTasks = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 更准确的日期解析 - 支持多种格式
      let dueDate = null;
      let taskText = trimmed;
      
      // 匹配日期格式: 8.30, 8-30, 8/30, 8月30日, 08.30等
      const datePatterns = [
        /(\d{1,2}[\.\/\-]\d{1,2})/g,  // 8.30, 8/30, 8-30
        /(\d{1,2}月\d{1,2}日?)/g,      // 8月30日
        /(今天|明天|后天)/g,            // 相对日期
        /(周[一二三四五六日])/g         // 周几
      ];

      let dateMatch = null;
      for (const pattern of datePatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          dateMatch = match[0];
          taskText = trimmed.replace(dateMatch, '').trim();
          break;
        }
      }

      // 解析具体日期
      if (dateMatch) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        if (dateMatch.includes('.') || dateMatch.includes('/') || dateMatch.includes('-')) {
          const separator = dateMatch.includes('.') ? '.' : (dateMatch.includes('/') ? '/' : '-');
          const [month, day] = dateMatch.split(separator).map(num => parseInt(num));
          if (month && day && month <= 12 && day <= 31) {
            dueDate = new Date(currentYear, month - 1, day);
          }
        } else if (dateMatch.includes('月')) {
          const monthDay = dateMatch.match(/(\d{1,2})月(\d{1,2})/);
          if (monthDay) {
            const month = parseInt(monthDay[1]);
            const day = parseInt(monthDay[2]);
            if (month <= 12 && day <= 31) {
              dueDate = new Date(currentYear, month - 1, day);
            }
          }
        } else if (dateMatch === '今天') {
          dueDate = new Date();
        } else if (dateMatch === '明天') {
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 1);
        } else if (dateMatch === '后天') {
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 2);
        }
      }

      // 清理任务文本（移除多余空格和标点）
      taskText = taskText.replace(/^[，,\s]+|[，,\s]+$/g, '').trim();
      
      if (!taskText) return; // 如果任务文本为空，跳过

      // AI智能分类
      const category = categorizeTask(taskText);
      
      // 生成优先级
      const priority = determinePriority(taskText, dueDate);

      parsedTasks.push({
        id: Date.now() + Math.random() + index,
        text: taskText,
        dueDate,
        category,
        priority,
        completed: false,
        createdAt: new Date()
      });
    });

    return parsedTasks;
  };

  // 改进的AI任务分类逻辑
  const categorizeTask = (taskText) => {
    const text = taskText.toLowerCase();
    
    // 学习相关关键词 - 更全面的匹配
    const studyKeywords = ['学习', '作业', '复习', '考试', '课程', '研究', '读书', '背书', 'study', 'homework', 'exam', 'course', 'learn'];
    if (studyKeywords.some(keyword => text.includes(keyword))) {
      return 'study';
    }
    
    // 工作相关关键词
    const workKeywords = ['工作', '会议', '项目', '报告', '客户', '任务', '上班', '开发', 'work', 'meeting', 'project', 'client'];
    if (workKeywords.some(keyword => text.includes(keyword))) {
      return 'work';
    }
    
    // 娱乐相关关键词
    const entertainmentKeywords = ['玩', '游戏', '电影', '聚会', '旅行', '约会', '看', '听', '逛', 'play', 'game', 'movie', 'party'];
    if (entertainmentKeywords.some(keyword => text.includes(keyword))) {
      return 'entertainment';
    }
    
    // 健康相关关键词
    const healthKeywords = ['锻炼', '健身', '跑步', '瑜伽', '运动', '医生', '体检', 'exercise', 'fitness', 'gym', 'run'];
    if (healthKeywords.some(keyword => text.includes(keyword))) {
      return 'health';
    }
    
    // 个人事务关键词
    const personalKeywords = ['购物', '家务', '清洁', '整理', '缴费', '买', '洗', '做饭', 'shopping', 'clean', 'cook'];
    if (personalKeywords.some(keyword => text.includes(keyword))) {
      return 'personal';
    }
    
    return 'uncategorized';
  };

  // 确定优先级
  const determinePriority = (taskText, dueDate) => {
    const text = taskText.toLowerCase();
    const now = new Date();
    
    // 基于截止日期的优先级
    if (dueDate) {
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 0) return 'high'; // 已过期或今天
      if (daysUntilDue <= 2) return 'high'; // 2天内
      if (daysUntilDue <= 7) return 'medium'; // 一周内
    }
    
    // 基于关键词的优先级
    const urgentKeywords = ['紧急', '重要', 'urgent', 'important', '急', '马上', '立即'];
    const importantKeywords = ['考试', '会议', '作业', 'exam', 'meeting', 'deadline'];
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    
    if (importantKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  };

  // AI智能时间分配
  const generateScheduleSuggestion = () => {
    const incompleteTasks = tasks.filter(task => !task.completed);
    const today = new Date();
    
    // 按优先级和截止日期排序
    const sortedTasks = incompleteTasks.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      
      // 首先按优先级
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 然后按截止日期
      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      return 0;
    });

    return sortedTasks.slice(0, 5);
  };

  // 添加任务
  const addTasks = () => {
    const raw = taskInputRef.current ? taskInputRef.current.value : '';
    if (!raw.trim()) return;
    const newTasks = parseTaskInput(raw);
    if (newTasks.length > 0) {
      setTasks(prevTasks => [...prevTasks, ...newTasks]);
      if (taskInputRef.current) taskInputRef.current.value = '';
    }
  };

  // 添加想法到草稿
  const addIdea = () => {
    const raw = ideaInputRef.current ? ideaInputRef.current.value : '';
    if (!raw.trim()) return;
    
    const newDraft = {
      id: Date.now(),
      content: raw,
      createdAt: new Date(),
      type: 'idea'
    };
    
    setDrafts(prevDrafts => [...prevDrafts, newDraft]);
    setIdeas(prevIdeas => [...prevIdeas, {
      id: Date.now(),
      text: raw,
      processed: true
    }]);
    if (ideaInputRef.current) ideaInputRef.current.value = '';
  };

  // 登录组件 - 莫兰迪色系
  const LoginView = () => (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-lg border border-stone-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-light text-stone-800 mb-2">FlowMind 🧠</h1>
          <p className="text-stone-500 text-sm">Intelligent Task Management</p>
        </div>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            ref={usernameRef}
            autoComplete="username"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all text-stone-700"
          />
          <input
            type="password"
            placeholder="Password"
            ref={passwordRef}
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all text-stone-700"
          />
          <button
            onClick={() => {
              const name = usernameRef.current ? usernameRef.current.value : '';
              setUser({ name: name || 'User', id: 1 });
              setCurrentView('dashboard');
            }}
            className="w-full bg-gradient-to-r from-slate-500 to-stone-400 text-white py-3 rounded-xl font-medium hover:scale-105 hover:shadow-lg transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );

  // 主界面 - 莫兰迪色系
  const DashboardView = () => (
    <div className="min-h-screen bg-stone-50">
      {/* 导航栏 */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center">
                <Brain className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-medium text-stone-800">FlowMind 🧠</h1>
            </div>
            
            <div className="flex items-center space-x-1">
              <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')}>
                📋 Tasks
              </NavButton>
              <NavButton active={currentView === 'ideas'} onClick={() => setCurrentView('ideas')}>
                💡 Ideas
              </NavButton>
              <NavButton active={currentView === 'drafts'} onClick={() => setCurrentView('drafts')}>
                📝 Drafts
              </NavButton>
              
              <div className="ml-6 flex items-center space-x-2 text-stone-600">
                <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center">
                  <User size={16} />
                </div>
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentView === 'dashboard' && <TaskManager />}
        {currentView === 'ideas' && <IdeaCollector />}
        {currentView === 'drafts' && <DraftManager />}
      </div>
    </div>
  );

  // 导航按钮组件
  const NavButton = ({ children, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-slate-100 text-slate-700' 
          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
      }`}
    >
      {children}
    </button>
  );

  // 任务管理组件 - 简约风格
  const TaskManager = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 任务输入区 */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-stone-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-stone-800">✨ Add Tasks</h2>
            <Plus size={20} className="text-stone-400" />
          </div>
          
          <div className="space-y-4">
            <textarea
              ref={taskInputRef}
              placeholder="Enter tasks (supports smart parsing):
Complete IFB240 study 8.30
Complete React learning 8.29
Go out with Ella 8.19

Or use line breaks, semicolons to separate tasks."
              className="w-full h-32 px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all resize-none text-stone-700 placeholder-stone-400 shadow-sm"
            />
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-stone-500">
                Supports: task description + date (e.g., 8.30 or Aug 30)
              </div>
              <button
                onClick={addTasks}
                className="bg-slate-500 text-white px-6 py-2.5 rounded-xl hover:bg-slate-600 transition-all text-sm font-medium flex items-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Brain size={16} />
                <span>🤖 AI Parse</span>
              </button>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xl">
          <h2 className="text-xl font-medium text-stone-800 mb-6">📋 Task List</h2>
          
          <div className="space-y-3">
            {tasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))}
            
            {tasks.length === 0 && (
              <div className="text-center py-12 text-stone-400">
                <Clock size={32} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">No tasks yet. Add your first task!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI建议区 */}
      <div className="space-y-6">
        <div className="bg-slate-500 rounded-2xl p-6 text-white border border-stone-200">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Brain className="mr-2" size={20} />
            🎯 AI Suggestions
          </h3>
          
          <div className="space-y-3">
            {generateScheduleSuggestion().map((task, index) => (
              <div key={task.id} className="bg-white/20 rounded-xl p-3 border border-white/10">
                <div className="text-xs opacity-75 mb-1">Priority #{index + 1}</div>
                <div className="font-medium text-sm">{task.text}</div>
                {task.dueDate && (
                  <div className="text-xs opacity-75 mt-1 flex items-center">
                    <Calendar size={10} className="mr-1" />
                    {task.dueDate.toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
            
            {generateScheduleSuggestion().length === 0 && (
              <div className="text-center py-6 opacity-75">
                <p className="text-sm">No tasks to prioritize</p>
              </div>
            )}
          </div>
        </div>

        {/* 标签统计 */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
          <h3 className="text-lg font-medium text-stone-800 mb-4">📊 Task Distribution</h3>
          <div className="space-y-3">
            {taskTags.map(tag => {
              const count = tasks.filter(task => task.category === tag.id).length;
              return (
                <div key={tag.id} className="flex items-center justify-between">
                  <span className="text-sm text-stone-600">{tag.name}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tag.bg} ${tag.color}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // 任务项组件 - 简约风格
  const TaskItem = ({ task }) => {
    const tag = taskTags.find(t => t.id === task.category);
    const priorityStyles = {
      high: 'border-stone-300 bg-stone-50',
      medium: 'border-stone-200 bg-white',
      low: 'border-stone-200 bg-white'
    };

    return (
      <div className={`border rounded-xl p-4 transition-all hover:shadow-sm ${priorityStyles[task.priority]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={() => {
                setTasks(prevTasks => prevTasks.map(t => 
                  t.id === task.id ? { ...t, completed: !t.completed } : t
                ));
              }}
              className="hover:scale-110 transition-transform"
            >
              {task.completed ? 
                <CheckCircle className="text-stone-500" size={18} /> :
                <Circle className="text-stone-400" size={18} />
              }
            </button>
            
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-stone-800 ${task.completed ? 'line-through text-stone-500' : ''}`}>
                {task.text}
              </div>
              
              <div className="flex items-center space-x-3 mt-2">
                {tag && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tag.bg} ${tag.color}`}>
                    {tag.name}
                  </span>
                )}
                
                {task.dueDate && (
                  <span className="text-xs text-stone-500 flex items-center space-x-1">
                    <Calendar size={10} />
                    <span>{task.dueDate.toLocaleDateString()}</span>
                  </span>
                )}
                
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  task.priority === 'high' ? 'bg-stone-200 text-stone-700' :
                  task.priority === 'medium' ? 'bg-neutral-100 text-neutral-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {task.priority === 'high' ? 'High' :
                   task.priority === 'medium' ? 'Medium' : 'Low'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id))}
            className="text-stone-400 hover:text-stone-600 transition-colors hover:scale-110"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  // 想法收集组件 - 简约风格
  const IdeaCollector = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-stone-800">💡 Idea Collector</h2>
          <Lightbulb size={20} className="text-stone-400" />
        </div>
        
        <div className="space-y-6">
          <textarea
            ref={ideaInputRef}
            placeholder="Capture your thoughts, ideas, or random inspirations..."
            className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all resize-none text-stone-700 placeholder-stone-400"
          />
          
          <button
            onClick={addIdea}
            className="bg-slate-500 text-white px-6 py-2.5 rounded-xl hover:bg-slate-600 transition-all text-sm font-medium flex items-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>✨ Add to Drafts</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 草稿管理组件 - 简约风格
  const DraftManager = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-stone-800">📝 Draft Box</h2>
          <FileText size={20} className="text-stone-400" />
        </div>
        
        <div className="space-y-4">
          {drafts.map(draft => (
            <div key={draft.id} className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-stone-800 font-medium">{draft.content}</p>
                  <p className="text-xs text-stone-500 mt-2">
                    {draft.createdAt.toLocaleString()}
                  </p>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      const newTask = {
                        id: Date.now(),
                        text: draft.content,
                        category: categorizeTask(draft.content),
                        priority: 'medium',
                        completed: false,
                        createdAt: new Date()
                      };
                      setTasks(prevTasks => [...prevTasks, newTask]);
                      setDrafts(prevDrafts => prevDrafts.filter(d => d.id !== draft.id));
                    }}
                    className="text-slate-500 hover:text-slate-700 transition-colors hover:scale-110"
                    title="Convert to Task"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => setDrafts(prevDrafts => prevDrafts.filter(d => d.id !== draft.id))}
                    className="text-stone-400 hover:text-stone-600 transition-colors hover:scale-110"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {drafts.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <FileText size={32} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No drafts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {!user ? <LoginView /> : <DashboardView />}
    </div>
  );
};

export default FlowMind;
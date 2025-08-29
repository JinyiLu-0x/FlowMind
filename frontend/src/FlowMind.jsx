import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, User, Brain, Clock, Tag, Trash2, Edit3, CheckCircle, Circle, Lightbulb, FileText, Settings, ChevronDown } from 'lucide-react';

// 在文件顶部（组件外或组件内最上方）添加统一的 emoji 配置，便于全局替换
const LOGO_PATH = '/logo.png'; // 你可改为 '🪄' / '⚡️' / '🌿' 等更好看的 emoji
const TAG_EMOJI_CHOICES = {
  personal: '🏠',
  work: '💼',
  study: '📚',
  entertainment: '🎮',
  health: '🏃',
  other: '🔖'
};

const FlowMind = () => {
  // 状态管理
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [smartEntries, setSmartEntries] = useState([]); // 智能条目存储
  const [connections, setConnections] = useState([]); // 知识连接
  const [drafts, setDrafts] = useState([]); // 未直接转为任务的想法草稿
  const [currentView, setCurrentView] = useState('login');
  const [selectedDate, setSelectedDate] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const taskInputRef = useRef(null);
  const ideaInputRef = useRef(null);

  // 任务标签 - 莫兰迪色系（保留 emoji/名称）
  const taskTags = [
    { id: 'personal', name: `${TAG_EMOJI_CHOICES.personal} Personal`, color: 'text-slate-600', bg: 'bg-slate-100' },
    { id: 'work', name: `${TAG_EMOJI_CHOICES.work} Work`, color: 'text-stone-600', bg: 'bg-stone-100' },
    { id: 'study', name: `${TAG_EMOJI_CHOICES.study} Study`, color: 'text-neutral-600', bg: 'bg-neutral-100' },
    { id: 'entertainment', name: `${TAG_EMOJI_CHOICES.entertainment} Entertainment`, color: 'text-zinc-600', bg: 'bg-zinc-100' },
    { id: 'health', name: `${TAG_EMOJI_CHOICES.health} Health`, color: 'text-gray-600', bg: 'bg-gray-100' },
    { id: 'uncategorized', name: `${TAG_EMOJI_CHOICES.other} Other`, color: 'text-slate-500', bg: 'bg-slate-50' }
  ];

  // 智能解析输入内容
  const parseSmartInput = (input) => {
    const text = input.trim();
    if (!text) return null;

    // 解析日期
    let dueDate = null;
    let cleanText = text;
    
    const datePatterns = [
      /(\d{1,2}[\.\/\-]\d{1,2})/g,
      /(\d{1,2}月\d{1,2}日?)/g,
      /(今天|明天|后天)/g,
      /(周[一二三四五六日])/g
    ];

    let dateMatch = null;
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        dateMatch = match[0];
        cleanText = text.replace(dateMatch, '').trim();
        break;
      }
    }

    if (dateMatch) {
      const currentYear = new Date().getFullYear();
      
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

    // 提取关键信息
    const keywords = extractKeywords(cleanText);
    const category = categorizeTask(cleanText);
    const priority = determinePriority(cleanText, dueDate);
    const entities = extractEntities(cleanText);

    return {
      id: Date.now() + Math.random(),
      originalText: text,
      cleanText,
      dueDate,
      category,
      priority,
      keywords,
      entities,
      details: [],
      completed: false,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
  };

  // 提取关键词
  const extractKeywords = (text) => {
    const stopWords = ['的', '了', '在', '是', '有', '和', '与', '跟', '及', '以及'];
    const words = text.split(/[\s，,。.！!？?；;：:]/).filter(word => 
      word.length > 1 && !stopWords.includes(word)
    );
    return [...new Set(words)];
  };

  // 提取实体（人名、地点、技能等）
  const extractEntities = (text) => {
    const entities = {
      people: [],
      places: [],
      skills: [],
      tools: [],
      concepts: []
    };

    // 人名匹配
    const peoplePatterns = [/和(.+?)见面/g, /找(.+?)讨论/g, /(.+?)老师/g, /(.+?)同学/g];
    peoplePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.people.push(match[1]);
      }
    });

    // 地点匹配
    const placePatterns = [/在(.+?)会议/g, /去(.+?)学习/g, /(.+?)教室/g, /(.+?)实验室/g];
    placePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.places.push(match[1]);
      }
    });

    // 技能和工具匹配
    const skillKeywords = ['学习', '掌握', '练习', '研究', '开发'];
    const techKeywords = ['Python', 'React', 'JavaScript', 'AI', 'Machine Learning', 'Cyber Security'];
    
    skillKeywords.forEach(skill => {
      if (text.includes(skill)) {
        const words = text.split(/[\s，,。.]/).filter(word => word.length > 2);
        words.forEach(word => {
          if (word.includes(skill) && word !== skill) {
            entities.skills.push(word);
          }
        });
      }
    });

    techKeywords.forEach(tech => {
      if (text.toLowerCase().includes(tech.toLowerCase())) {
        entities.tools.push(tech);
      }
    });

    return entities;
  };

  // 智能关联分析
  const findConnections = (newEntry) => {
    const connections = [];
    
    smartEntries.forEach(existing => {
      if (existing.id === newEntry.id) return;
      
      let connectionStrength = 0;
      let connectionReasons = [];

      // 关键词重叠
      const commonKeywords = newEntry.keywords.filter(k => 
        existing.keywords.includes(k)
      );
      if (commonKeywords.length > 0) {
        connectionStrength += commonKeywords.length * 2;
        connectionReasons.push(`共同关键词: ${commonKeywords.join(', ')}`);
      }

      // 实体重叠
      Object.keys(newEntry.entities).forEach(entityType => {
        const commonEntities = newEntry.entities[entityType].filter(e =>
          existing.entities[entityType].includes(e)
        );
        if (commonEntities.length > 0) {
          connectionStrength += commonEntities.length * 3;
          connectionReasons.push(`${entityType}: ${commonEntities.join(', ')}`);
        }
      });

      // 类别相关
      if (newEntry.category === existing.category) {
        connectionStrength += 1;
        connectionReasons.push('相同类别');
      }

      // 时间相近
      if (newEntry.dueDate && existing.dueDate) {
        const daysDiff = Math.abs(newEntry.dueDate - existing.dueDate) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 7) {
          connectionStrength += 2;
          connectionReasons.push('时间相近');
        }
      }

      if (connectionStrength >= 2) {
        connections.push({
          id: `${newEntry.id}-${existing.id}`,
          from: newEntry.id,
          to: existing.id,
          strength: connectionStrength,
          reasons: connectionReasons,
          type: connectionStrength >= 5 ? 'strong' : 'weak'
        });
      }
    });

    return connections;
  };

  // 添加智能条目（改为：尝试转为 task，否则放到 drafts）
  const addSmartEntry = () => {
    const input = ideaInputRef.current?.value;
    if (!input?.trim()) return;

    const parsed = parseSmartInput(input);
    console.log('[Debug] addSmartEntry input=', input, 'parsed=', parsed);
    if (!parsed) return;

    // 判定规则：只有有截止日期 / 非 uncategorized 类别 / 高优先级 才直接成为 task
    // （移除基于 keywords 的自动转任务判断，避免过度触发）
    const shouldCreateTask = Boolean(
      parsed.dueDate ||
      (parsed.category && parsed.category !== 'uncategorized') ||
      parsed.priority === 'high'
    );

    console.log('[Debug] shouldCreateTask=', shouldCreateTask);

    if (shouldCreateTask) {
      // 从 parsed 生成 task，并加入 tasks
      const newTask = {
        id: Date.now() + Math.random(),
        text: parsed.cleanText || parsed.originalText,
        dueDate: parsed.dueDate || null,
        category: parsed.category || 'uncategorized',
        priority: parsed.priority || 'low',
        completed: false,
        createdAt: new Date()
      };
      setTasks(prev => [...prev, newTask]);

      // 同时把 parsed 保留到 smartEntries（用于知识提取/连接）
      setSmartEntries(prev => {
        const next = [...prev, parsed];
        // 计算并合并新连接
        const newConnections = findConnections(parsed);
        setConnections(cPrev => [...cPrev, ...newConnections]);
        return next;
      });
    } else {
      // 放到 drafts（最新放最前面，便于查看）
      setDrafts(prev => [parsed, ...prev]);
    }

    // 清空输入
    if (ideaInputRef.current) ideaInputRef.current.value = '';
  };

  // 查找现有任务
  const findExistingTask = (newEntry) => {
    return smartEntries.find(existing => {
      const keywordMatch = newEntry.keywords.some(k => 
        existing.keywords.includes(k) || existing.cleanText.includes(k)
      );
      const entityMatch = Object.keys(newEntry.entities).some(entityType =>
        newEntry.entities[entityType].some(e =>
          existing.entities[entityType].includes(e)
        )
      );
      
      return keywordMatch || entityMatch;
    });
  };

  // 合并实体
  const mergeEntities = (entities1, entities2) => {
    const merged = { ...entities1 };
    Object.keys(entities2).forEach(key => {
      merged[key] = [...new Set([...merged[key], ...entities2[key]])];
    });
    return merged;
  };

  // 解析任务输入（保持原有功能）
  const parseTaskInput = (input) => {
    const lines = input.split(/[;\n]/).filter(line => line.trim());
    const parsedTasks = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let dueDate = null;
      let taskText = trimmed;
      
      const datePatterns = [
        /(\d{1,2}[\.\/\-]\d{1,2})/g,
        /(\d{1,2}月\d{1,2}日?)/g,
        /(今天|明天|后天)/g,
        /(周[一二三四五六日])/g
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

      if (dateMatch) {
        const currentYear = new Date().getFullYear();
        
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

      taskText = taskText.replace(/^[，,\s]+|[，,\s]+$/g, '').trim();
      
      if (!taskText) return;

      const category = categorizeTask(taskText);
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

  // 登录组件 - 去掉渐变，改为纯色背景并自适应
  const LoginView = () => (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-stone-50 dark:bg-slate-900 transition-colors">
      <div className="w-full max-w-md">
        <Card className="p-8 bg-white dark:bg-[#071026]">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white border border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <img src={LOGO_PATH} alt="FlowMind Logo" className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">FlowMind</h1>
            <p className="text-sm text-stone-500 dark:text-stone-300 mt-1">Intelligent Task Management</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              ref={usernameRef}
              autoComplete="username"
              className="w-full px-4 py-3 bg-stone-50 dark:bg-transparent border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors text-stone-700 dark:text-stone-100"
            />
            <input
              type="password"
              placeholder="Password"
              ref={passwordRef}
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-stone-50 dark:bg-transparent border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors text-stone-700 dark:text-stone-100"
            />
            <button
              onClick={() => {
                const name = usernameRef.current ? usernameRef.current.value : '';
                setUser({ name: name || 'User', id: 1 });
                setCurrentView('dashboard');
              }}
              className="w-full bg-slate-600 text-white py-3 rounded-xl font-medium hover:scale-105 hover:shadow-lg transition-transform"
            >
              Sign In
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
  
  // 导航按钮组件（保持不变）
  const NavButton = ({ children, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-stone-100'
          : 'text-stone-600 hover:bg-slate-100 hover:text-stone-900 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );

  // 任务管理组件 - 使用纯色容器并保证自适应与铺满宽度
  const TaskManager = () => (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 主列 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-stone-200 dark:bg-[#071026] dark:border-stone-700 w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-stone-800 dark:text-stone-100">✨ Add Tasks</h2>
              <Plus size={20} className="text-stone-400" />
            </div>
            
            <div className="space-y-4">
              <textarea
                ref={taskInputRef}
                placeholder="Enter tasks (supports smart parsing)"
                className="w-full h-32 px-4 py-3 bg-stone-50/80 dark:bg-transparent border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all resize-none text-stone-700 dark:text-stone-100 placeholder-stone-400 shadow-sm"
              />
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-stone-500 dark:text-stone-300">
                  Supports: description + date (e.g., 8.30 or Aug 30)
                </div>
                <button
                  onClick={addTasks}
                  className="bg-slate-500 text-white px-6 py-2.5 rounded-xl hover:bg-slate-600 transition-all text-sm font-medium flex items-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🤖 AI Parse</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xl dark:bg-[#071026] dark:border-stone-700 w-full">
            <h2 className="text-xl font-medium text-stone-800 dark:text-stone-100 mb-6">📋 Task List</h2>
            
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
              
              {tasks.length === 0 && (
                <div className="text-center py-12 text-stone-400 dark:text-stone-300">
                  <Clock size={32} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No tasks yet. Add your first task!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 侧栏 */}
        <div className="space-y-6">
          <div className="bg-slate-500 rounded-2xl p-6 text-white w-full">
            <h3 className="text-lg font-medium mb-4 flex items-center">
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

          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm dark:bg-[#071026] dark:border-stone-700 w-full">
            <h3 className="text-lg font-medium text-stone-800 mb-4">📊 Task Distribution</h3>
            <div className="space-y-3">
              {taskTags.map(tag => {
                const count = tasks.filter(task => task.category === tag.id).length;
                return (
                  <div key={tag.id} className="flex items-center justify-between">
                    <span className="text-sm text-stone-600 dark:text-stone-300">{tag.name}</span>
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

  // 智能想法收集器组件 - 已清理，移除残留 diff 标记
  const IdeaCollector = () => {
    // 将 draft 转为 task
    const promoteDraftToTask = (draft) => {
      const newTask = {
        id: Date.now() + Math.random(),
        text: draft.cleanText || draft.originalText,
        dueDate: draft.dueDate || null,
        category: draft.category || 'uncategorized',
        priority: draft.priority || 'low',
        completed: false,
        createdAt: new Date()
      };
      setTasks(prev => [...prev, newTask]);

      // 保留到 smartEntries 并计算连接
      setSmartEntries(prev => {
        const next = [...prev, draft];
        const newConnections = findConnections(draft);
        setConnections(cPrev => [...cPrev, ...newConnections]);
        return next;
      });

      // 从 drafts 中移除
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
    };

    const removeDraft = (id) => {
      setDrafts(prev => prev.filter(d => d.id !== id));
    };

    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 输入区 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-morandi rounded-3xl p-8 border">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-medium" style={{color: 'var(--m-fore)'}}>智能思考助手</h2>
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  ref={ideaInputRef}
                  placeholder="随口说一句话就行：例如“学习React 9.1”"
                  className="w-full h-40 px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all resize-none text-stone-700 placeholder-stone-400 text-sm leading-relaxed"
                />

                <div className="flex justify-between items-center">
                  <div className="text-xs text-stone-500 space-y-1">
                    <div>✨ 支持自然语言输入</div>
                    <div>🔗 自动建立知识连接</div>
                    <div>📅 智能提取时间和优先级</div>
                  </div>
                  <button
                    onClick={addSmartEntry}
                    className="btn-morandi px-8 py-3 rounded-xl hover:scale-105 hover:shadow-lg transition-all text-sm font-medium flex items-center space-x-2"
                  >
                    <span>🤖 智能解析</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 智能任务列表 */}
            <div className="card-morandi rounded-3xl p-6 border shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium" style={{color: 'var(--m-fore)'}}>📋 智能任务</h2>
                <div className="text-xs text-stone-500">
                  {smartEntries.length} 个智能条目
                </div>
              </div>
              
              <div className="space-y-4">
                {smartEntries.map(entry => (
                  <SmartTaskItem
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedTask === entry.id}
                    onToggleExpand={() => setExpandedTask(expandedTask === entry.id ? null : entry.id)}
                  />
                ))}
                
                {smartEntries.length === 0 && (
                  <div className="text-center py-12" style={{color: 'var(--m-muted)'}}>
                    <Lightbulb size={32} className="mx-auto mb-4 opacity-60" />
                    <p className="text-sm">还没有智能任务，开始输入第一个想法吧！</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：Knowledge / Drafts / Skills */}
          <div className="space-y-6">
            <div className="bg-slate-500 rounded-2xl p-6 text-white w-full">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                🔗 想法链接
              </h3>
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {connections.map(connection => {
                  const fromEntry = smartEntries.find(e => e.id === connection.from);
                  const toEntry = smartEntries.find(e => e.id === connection.to);
                  return (
                    <div key={connection.id} className="bg-white/20 rounded-xl p-3 border border-white/10">
                      <div className="text-xs opacity-75 mb-1">
                        {connection.type === 'strong' ? '🔥 强关联' : '💡 弱关联'}
                      </div>
                      <div className="text-sm font-medium mb-2">
                        {fromEntry?.cleanText.slice(0, 20)}...
                        <br />↓
                        <br />{toEntry?.cleanText.slice(0, 20)}...
                      </div>
                      <div className="text-xs opacity-75">
                        {connection.reasons.slice(0, 2).join(' • ')}
                      </div>
                    </div>
                  );
                })}
                
                {connections.length === 0 && (
                  <div className="text-center py-6 opacity-75">
                    <p className="text-sm">添加更多任务后会自动发现连接</p>
                  </div>
                )}
              </div>
            </div>

            {/* Drafts 面板 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-stone-800">🗂️ Drafts</h3>
                <div className="text-xs text-stone-500">{drafts.length}</div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {drafts.map(d => (
                  <div key={d.id} className="flex items-start justify-between p-3 rounded-lg border border-stone-100">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-stone-800 truncate">{d.cleanText}</div>
                      <div className="text-xs text-stone-500 mt-1">
                        {d.category} · {d.priority}{d.dueDate ? ` · ${d.dueDate.toLocaleDateString()}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => promoteDraftToTask(d)}
                        className="text-sm bg-slate-600 text-white px-3 py-1 rounded-md hover:opacity-90"
                      >
                        Promote
                      </button>
                      <button
                        onClick={() => removeDraft(d.id)}
                        className="text-sm text-stone-500 px-2 py-1 rounded-md hover:text-stone-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {drafts.length === 0 && (
                  <div className="text-center py-6 text-stone-400">
                    <p className="text-sm">没有草稿</p>
                  </div>
                )}
              </div>
            </div>

            {/* 技能树 */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
              <h3 className="text-lg font-medium text-stone-800 mb-4">🌟 技能发现</h3>
              <div className="space-y-3">
                {[...new Set(smartEntries.flatMap(entry => entry.entities.tools || []))].map(skill => (
                  <div key={skill} className="flex items-center justify-between">
                    <span className="text-sm text-stone-700">{skill}</span>
                    <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-full">
                      {smartEntries.filter(entry => (entry.entities.tools || []).includes(skill)).length}
                    </span>
                  </div>
                ))}

                {smartEntries.flatMap(entry => entry.entities.tools || []).length === 0 && (
                  <div className="text-center py-6 text-stone-400">
                    <p className="text-sm">添加包含技能的任务后会自动识别</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 智能任务项组件
  const SmartTaskItem = ({ entry, isExpanded, onToggleExpand }) => {
    const tag = taskTags.find(t => t.id === entry.category);
    const now = new Date();
    
    // 计算倒计时
    const getDaysUntilDue = () => {
      if (!entry.dueDate) return null;
      const diffTime = entry.dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    const daysLeft = getDaysUntilDue();
    
    const priorityStyles = {
      high: 'border-stone-300 bg-stone-50',
      medium: 'border-stone-200 bg-white',
      low: 'border-stone-200 bg-white'
    };

    return (
      <div className={`border rounded-xl p-4 transition-all hover:shadow-sm ${priorityStyles[entry.priority]}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={() => {
                setSmartEntries(prev => prev.map(e => 
                  e.id === entry.id ? { ...e, completed: !e.completed } : e
                ));
              }}
              className="hover:scale-110 transition-transform"
            >
              {entry.completed ? 
                <CheckCircle className="text-stone-500" size={18} /> :
                <Circle className="text-stone-400" size={18} />
              }
            </button>
            
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-stone-800 ${entry.completed ? 'line-through text-stone-500' : ''}`}>
                {entry.cleanText}
              </div>
              
              <div className="flex items-center space-x-3 mt-2 flex-wrap">
                {tag && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tag.bg} ${tag.color}`}>
                    {tag.name}
                  </span>
                )}
                
                {entry.dueDate && (
                  <span className={`text-xs flex items-center space-x-1 px-2 py-0.5 rounded-full ${
                    daysLeft !== null && daysLeft <= 0 ? 'bg-red-100 text-red-600' :
                    daysLeft !== null && daysLeft <= 2 ? 'bg-orange-100 text-orange-600' :
                    'text-stone-500'
                  }`}>
                    <Calendar size={10} />
                    <span>{entry.dueDate.toLocaleDateString()}</span>
                    {daysLeft !== null && (
                      <span className="font-medium">
                        {daysLeft === 0 ? '今天' : 
                         daysLeft < 0 ? `逾期${Math.abs(daysLeft)}天` :
                         `还有${daysLeft}天`}
                      </span>
                    )}
                  </span>
                )}
                
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  entry.priority === 'high' ? 'bg-stone-200 text-stone-700' :
                  entry.priority === 'medium' ? 'bg-neutral-100 text-neutral-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {entry.priority === 'high' ? '高优先级' :
                   entry.priority === 'medium' ? '中优先级' : '低优先级'}
                </span>

                {entry.details.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                    {entry.details.length} 条补充
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleExpand}
              className="text-stone-400 hover:text-stone-600 transition-colors hover:scale-110"
            >
              <ChevronDown 
                size={16} 
                className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <button
              onClick={() => setSmartEntries(prev => prev.filter(e => e.id !== entry.id))}
              className="text-stone-400 hover:text-stone-600 transition-colors hover:scale-110"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* 展开的详细信息 */}
        {isExpanded && (
          <div className="border-t border-stone-200 pt-4 mt-4 space-y-4">
            {/* 关键词 */}
            {entry.keywords.length > 0 && (
              <div>
                <div className="text-xs font-medium text-stone-600 mb-2">🏷️ 关键词</div>
                <div className="flex flex-wrap gap-1">
                  {entry.keywords.map((keyword, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-md">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 实体信息 */}
            {Object.entries(entry.entities).map(([type, items]) => 
              items.length > 0 && (
                <div key={type}>
                  <div className="text-xs font-medium text-stone-600 mb-2">
                    {type === 'people' ? '👥 相关人员' :
                     type === 'places' ? '📍 地点' :
                     type === 'skills' ? '🎯 技能' :
                     type === 'tools' ? '🛠️ 工具技术' : '💡 概念'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {items.map((item, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* 补充详情 */}
            {entry.details.length > 0 && (
              <div>
                <div className="text-xs font-medium text-stone-600 mb-2">📝 补充详情</div>
                <div className="space-y-2">
                  {entry.details.map(detail => (
                    <div key={detail.id} className="bg-stone-50 rounded-lg p-3">
                      <div className="text-sm text-stone-700">{detail.text}</div>
                      <div className="text-xs text-stone-500 mt-1">
                        {detail.addedAt.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 连接的任务 */}
            {connections.filter(c => c.from === entry.id || c.to === entry.id).length > 0 && (
              <div>
                <div className="text-xs font-medium text-stone-600 mb-2">🔗 相关任务</div>
                <div className="space-y-2">
                  {connections
                    .filter(c => c.from === entry.id || c.to === entry.id)
                    .map(connection => {
                      const relatedId = connection.from === entry.id ? connection.to : connection.from;
                      const relatedEntry = smartEntries.find(e => e.id === relatedId);
                      return (
                        <div key={connection.id} className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                          <div className="text-sm text-blue-800">{relatedEntry?.cleanText}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            {connection.reasons.join(' • ')}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 自动根据系统主题偏好加/删 `dark` class，帮助 Tailwind dark: 类生效
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      if (e.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };
    // 初始应用
    if (mq) apply(mq);
    // 监听变化
    mq && mq.addEventListener && mq.addEventListener('change', apply);
    return () => mq && mq.removeEventListener && mq.removeEventListener('change', apply);
  }, []);

  // 通用卡片组件（保留样式，但确保透明度在深色下可读）
  const Card = ({ children, className = '' }) => (
    <div className={`bg-white/90 dark:bg-[#071026]/80 border border-stone-200 dark:border-stone-700 rounded-2xl p-6 shadow-md ${className}`}>
      {children}
    </div>
  );

  // 主渲染：外层保持全页纯色背景并自适应
  return (
    <div className="min-h-screen w-full bg-stone-50 dark:bg-slate-900 transition-colors flex flex-col">
      {!user ? <LoginView /> : (
        <div className="flex-1 flex flex-col">
          {/* 导航：整条导航栏为玻璃质感（整条都是 card-morandi + glass-hover） */}
          <nav className="card-morandi glass-hover surface-morandi w-full border-b border-transparent sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3" style={{paddingLeft: 6}}>
                    <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{background: 'transparent'}}>
                      <img src={LOGO_PATH} alt="FlowMind Logo" className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold" style={{color: 'var(--m-fore)'}}>FlowMind</div>
                      <div style={{fontSize: 11, color: 'var(--m-muted)', lineHeight: 1}}>Tasks · Ideas · Links</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <NavButton active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')}>Tasks</NavButton>
                  <NavButton active={currentView === 'ideas'} onClick={() => setCurrentView('ideas')}>Smart Ideas</NavButton>
                  <div className="ml-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full surface-morandi flex items-center justify-center">
                      <User size={14} />
                    </div>
                    <div className="text-sm font-medium" style={{color: 'var(--m-fore)'}}>{user?.name}</div>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentView === 'dashboard' && <TaskManager />}
            {currentView === 'ideas' && <IdeaCollector />}
          </main>
        </div>
      )}
    </div>
  );
};

export default FlowMind;
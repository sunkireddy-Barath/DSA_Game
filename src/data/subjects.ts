// Subject registry. Only subjects with status 'live' have working lessons/simulators.
// Planned subjects list their curriculum honestly; nothing is simulated for them yet.
export interface Subject {
  key: string; name: string; world: string; blurb: string; status: 'live' | 'planned';
  difficulty: string; hours: number; modules: string[]; workspace: string; phase: string;
}
export const SUBJECTS: Subject[] = [
  { key: 'dsa', name: 'Data Structures & Algorithms', world: 'DSA World', status: 'live', difficulty: 'Beginner → Advanced', hours: 120, phase: 'Phase 2',
    blurb: "Striver's A2Z sheet with a real C++ tracer: step through actual code, watch arrays, maps, DP tables, recursion trees and backtracking.",
    workspace: 'Code + live visualization + execution inspector',
    modules: ['Learn the Basics', 'Sorting', 'Arrays', 'Binary Search', 'Strings', 'Linked List', 'Recursion', 'Bit Manipulation', 'Stack & Queues', 'Sliding Window', 'Heaps', 'Greedy', 'Binary Trees', 'BST', 'Graphs', 'Dynamic Programming', 'Tries', 'Advanced Strings'] },
  { key: 'dbms', name: 'Database Management Systems', world: 'Database World', status: 'live', difficulty: 'Intermediate', hours: 40, phase: 'Phase 3',
    blurb: 'Normalization, ACID transactions, locking and deadlocks, B+ tree indexing, recovery.', workspace: 'Schema/transaction canvas + database inspector',
    modules: ['DBMS Fundamentals', 'Data Models', 'Relational Concepts', 'Functional Dependencies', 'Normalization', 'Transactions', 'Concurrency Control', 'Storage & Indexing', 'Query Processing', 'Recovery', 'Distributed Databases'] },
  { key: 'sql', name: 'SQL Query Lab', world: 'SQL World', status: 'live', difficulty: 'Beginner → Advanced', hours: 30, phase: 'Phase 4',
    blurb: 'Write real SQL, see rows flow through joins, filters and projections, read EXPLAIN plans.', workspace: 'Query editor + tables + execution flow',
    modules: ['SQL Fundamentals', 'Filtering', 'Sorting & Aggregation', 'Joins', 'Advanced SQL', 'Database Programming', 'Interview SQL'] },
  { key: 'os', name: 'Operating Systems', world: 'Operating System World', status: 'live', difficulty: 'Intermediate', hours: 45, phase: 'Phase 5',
    blurb: "CPU scheduling Gantt charts, page replacement, Banker's algorithm, deadlocks.", workspace: 'Process & memory simulation + scheduler',
    modules: ['Fundamentals', 'Processes', 'Threads', 'CPU Scheduling', 'Synchronization', 'Deadlocks', 'Memory Management', 'Storage'] },
  { key: 'oops', name: 'Object-Oriented Programming', world: 'OOPS World', status: 'live', difficulty: 'Beginner → Intermediate', hours: 30, phase: 'Phase 6',
    blurb: 'Classes, objects, inheritance, vtables, constructors/destructors and RAII with traced C++.', workspace: 'C++ editor + object memory + class relationships',
    modules: ['Classes & Objects', 'Encapsulation & Abstraction', 'Inheritance', 'Polymorphism', 'Constructors & Destructors', 'Smart Pointers & RAII', 'SOLID'] },
  { key: 'cn', name: 'Computer Networks', world: 'Network World', status: 'live', difficulty: 'Intermediate', hours: 35, phase: 'Phase 7',
    blurb: 'Follow packets through DNS, TCP handshakes, routers; subnetting lab.', workspace: 'Topology + packet inspector',
    modules: ['Fundamentals', 'OSI & TCP/IP', 'Data Link', 'Network Layer', 'Transport Layer', 'Application Layer'] },
  { key: 'coa', name: 'Computer Organization & Architecture', world: 'Computer Architecture World', status: 'live', difficulty: 'Intermediate', hours: 35, phase: 'Phase 8',
    blurb: 'Inside the CPU: instruction cycle, caches, pipelines and hazards.', workspace: 'CPU diagram + instruction inspector',
    modules: ['Number Systems', 'Digital Logic', 'CPU Architecture', 'Instruction Cycle', 'Cache Memory', 'Pipelining', 'I/O & DMA'] },
  { key: 'sysdesign', name: 'System Design', world: 'System Design World', status: 'live', difficulty: 'Advanced', hours: 40, phase: 'Phase 9',
    blurb: 'Drag-and-drop architecture canvas with traffic and failure simulation.', workspace: 'Architecture canvas + traffic simulator',
    modules: ['Fundamentals', 'Architecture Styles', 'Communication', 'Databases & Storage', 'Distributed Systems', 'Reliability Patterns'] },
  { key: 'se', name: 'Software Engineering & Design Patterns', world: 'Software Engineering World', status: 'live', difficulty: 'Intermediate', hours: 30, phase: 'Phase 10',
    blurb: 'SDLC, testing, UML and the classic design patterns.', workspace: 'Class diagram canvas + runtime behaviour',
    modules: ['SDLC & Agile', 'UML', 'Testing', 'Creational Patterns', 'Structural Patterns', 'Behavioral Patterns'] },
  { key: 'dev', name: 'Git, Linux & Developer Fundamentals', world: 'Developer Tools World', status: 'live', difficulty: 'Beginner', hours: 20, phase: 'Phase 10',
    blurb: 'Terminal simulation with a visual repository and file system.', workspace: 'Terminal + repository/file-system visualizer',
    modules: ['Git Fundamentals', 'Branching & Merging', 'Remote & PRs', 'Linux Basics', 'Permissions & Processes', 'Shell Scripting'] },
];

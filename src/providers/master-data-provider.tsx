'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { 
    Student,
    Employee, 
    Lecturer, 
    Department, 
    Classroom, 
    BuildingBlock, 
    Recognition, 
    IncidentCategory,
    Role,
    Position
} from '@/lib/types';

interface MasterDataContextType {
    employees: Employee[];
    lecturers: Lecturer[];
    departments: Department[];
    rooms: Classroom[];
    blocks: BuildingBlock[];
    recognitions: Recognition[];
    incidentCategories: IncidentCategory[];
    roles: Role[];
    positions: Position[];
    students: Student[];
    employeesMap: Map<string, Employee>;
    lecturersMap: Map<string, Lecturer>;
    studentsMap: Map<string, Student>;
    loading: boolean;
    heavyLoading: boolean;
    loadStates: {
        employees: boolean;
        lecturers: boolean;
        departments: boolean;
        rooms: boolean;
        blocks: boolean;
        recognitions: boolean;
        incidentCategories: boolean;
        roles: boolean;
        positions: boolean;
        students: boolean;
    };
    requestPersonnelData: () => void;
    personnelRequested: boolean;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const isAuthenticated = !!authUser;
    const [personnelRequested, setPersonnelRequested] = useState(false);

    // Define collection references
    const employeesRef = useMemo(() => (firestore && isAuthenticated ? collection(firestore, 'employees') : null), [firestore, isAuthenticated]);
    const lecturersRef = useMemo(() => (firestore && isAuthenticated && personnelRequested ? collection(firestore, 'lecturers') : null), [firestore, isAuthenticated, personnelRequested]);
    const departmentsRef = useMemo(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const roomsRef = useMemo(() => (firestore ? collection(firestore, 'classrooms') : null), [firestore]);
    const blocksRef = useMemo(() => (firestore ? collection(firestore, 'building-blocks') : null), [firestore]);
    const recognitionsRef = useMemo(() => (firestore ? collection(firestore, 'recognitions') : null), [firestore]);
    const incidentCategoriesRef = useMemo(() => (firestore ? collection(firestore, 'incident-categories') : null), [firestore]);
    const rolesRef = useMemo(() => (firestore && isAuthenticated ? collection(firestore, 'roles') : null), [firestore, isAuthenticated]);
    const positionsRef = useMemo(() => (firestore && isAuthenticated ? collection(firestore, 'positions') : null), [firestore, isAuthenticated]);
    const studentsRef = useMemo(() => (firestore && isAuthenticated && personnelRequested ? collection(firestore, 'students') : null), [firestore, isAuthenticated, personnelRequested]);

    // Fetch data using useCollection hook
    const { data: employees, loading: empLoading } = useCollection<Employee>(employeesRef);
    const { data: lecturers, loading: lecLoading } = useCollection<Lecturer>(lecturersRef);
    const { data: departments, loading: deptLoading } = useCollection<Department>(departmentsRef);
    const { data: rooms, loading: roomLoading } = useCollection<Classroom>(roomsRef);
    const { data: blocks, loading: blockLoading } = useCollection<BuildingBlock>(blocksRef);
    const { data: recognitions, loading: recLoading } = useCollection<Recognition>(recognitionsRef);
    const { data: incidentCategories, loading: incLoading } = useCollection<IncidentCategory>(incidentCategoriesRef);
    const { data: roles, loading: roleLoading } = useCollection<Role>(rolesRef);
    const { data: positions, loading: posLoading } = useCollection<Position>(positionsRef);
    const { data: students, loading: stuLoading } = useCollection<Student>(studentsRef);

    // Main loading state should ONLY wait for core data needed for permissions and layout
    const coreLoading = empLoading || deptLoading || blockLoading || roleLoading || posLoading || recLoading || incLoading;
    const heavyLoading = (personnelRequested && (stuLoading || lecLoading)) || roomLoading;
    const loading = coreLoading; 

    const employeesMap = useMemo(() => {
        const map = new Map<string, Employee>();
        (employees || []).forEach(e => {
            if (e.id) map.set(String(e.id), e);
            if (e.email) map.set(String(e.email).toLowerCase(), e);
            if (e.employeeId) map.set(String(e.employeeId), e);
        });
        return map;
    }, [employees]);

    const lecturersMap = useMemo(() => {
        if (!personnelRequested) return new Map<string, Lecturer>();
        const map = new Map<string, Lecturer>();
        (lecturers || []).forEach(l => {
            if (l.id) map.set(String(l.id), l);
            if (l.email) map.set(String(l.email).toLowerCase(), l);
        });
        return map;
    }, [lecturers, personnelRequested]);

    const studentsMap = useMemo(() => {
        if (!personnelRequested) return new Map<string, Student>();
        const map = new Map<string, Student>();
        (students || []).forEach(s => {
            const sid = s.id ? String(s.id) : '';
            if (sid) {
                map.set(sid, s);
                map.set(sid.toLowerCase(), s);
            }
            
            const cid = s.citizenId ? String(s.citizenId) : '';
            if (cid) {
                map.set(cid, s);
                map.set(cid.toLowerCase(), s);
            }
            
            const ident = s.identifier ? String(s.identifier) : '';
            if (ident) {
                map.set(ident, s);
                map.set(ident.toLowerCase(), s);
            }
        });
        return map;
    }, [students, personnelRequested]);

    const value = useMemo(() => ({
        employees: employees || [],
        lecturers: lecturers || [],
        departments: departments || [],
        rooms: rooms || [],
        blocks: blocks || [],
        recognitions: recognitions || [],
        incidentCategories: incidentCategories || [],
        roles: roles || [],
        positions: positions || [],
        students: students || [],
        employeesMap,
        lecturersMap,
        studentsMap,
        loading,
        heavyLoading,
        loadStates: {
            employees: empLoading,
            lecturers: lecLoading,
            departments: deptLoading,
            rooms: roomLoading,
            blocks: blockLoading,
            recognitions: recLoading,
            incidentCategories: incLoading,
            roles: roleLoading,
            positions: posLoading,
            students: stuLoading
        },
        requestPersonnelData: () => setPersonnelRequested(true),
        personnelRequested
    }), [
        employees, lecturers, departments, rooms, blocks, 
        recognitions, incidentCategories, roles, positions, students, 
        employeesMap, lecturersMap, studentsMap,
        loading, heavyLoading, empLoading, lecLoading, deptLoading, roomLoading, 
        blockLoading, recLoading, incLoading, roleLoading, posLoading, stuLoading,
        personnelRequested
    ]);

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
}

export function useMasterData() {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
}

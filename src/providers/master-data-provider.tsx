'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
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
    loading: boolean;
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
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();

    // Define collection references
    const employeesRef = useMemo(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const lecturersRef = useMemo(() => (firestore ? collection(firestore, 'lecturers') : null), [firestore]);
    const departmentsRef = useMemo(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const roomsRef = useMemo(() => (firestore ? collection(firestore, 'classrooms') : null), [firestore]);
    const blocksRef = useMemo(() => (firestore ? collection(firestore, 'building-blocks') : null), [firestore]);
    const recognitionsRef = useMemo(() => (firestore ? collection(firestore, 'recognitions') : null), [firestore]);
    const incidentCategoriesRef = useMemo(() => (firestore ? collection(firestore, 'incident-categories') : null), [firestore]);
    const rolesRef = useMemo(() => (firestore ? collection(firestore, 'roles') : null), [firestore]);
    const positionsRef = useMemo(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const studentsRef = useMemo(() => (firestore ? collection(firestore, 'students') : null), [firestore]);

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

    const loading = empLoading || lecLoading || deptLoading || roomLoading || blockLoading || recLoading || incLoading || roleLoading || posLoading || stuLoading;

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
        loading,
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
        }
    }), [
        employees, lecturers, departments, rooms, blocks, 
        recognitions, incidentCategories, roles, positions, students, 
        loading, empLoading, lecLoading, deptLoading, roomLoading, 
        blockLoading, recLoading, incLoading, roleLoading, posLoading, stuLoading
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

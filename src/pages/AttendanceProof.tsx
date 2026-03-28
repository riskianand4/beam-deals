import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import type { AttendanceRecord } from "@/types";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = { present: "Hadir", late: "Terlambat", absent: "Tidak Hadir", leave: "Cuti/Izin" };
const STATUS_BADGE: Record<string, string> = { present: "bg-success/10 text-success border-success/20", late: "bg-warning/10 text-warning border-warning/20", absent: "bg-destructive/10 text-destructive border-destructive/20", leave: "bg-primary/10 text-primary border-primary/20" };
const REASON_LABEL: Record<string, string> = { izin: "Izin", sakit: "Sakit", alpa: "Alpa", "dinas luar": "Dinas Luar" };

const AttendanceProof = () => {
  const { employeeId, attendanceId } = useParams();
  const navigate = useNavigate();
  const { users } = useAuth();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

  useEffect(() => {
    api.getAttendance({}).then((records) => {
      const found = records.find(r => r.id === attendanceId);
      setRecord(found || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [attendanceId]);

  const employee = users.find(u => u.id === employeeId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground text-sm">Memuat...</div></div>;
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-muted-foreground">Data tidak ditemukan</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Kembali</Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Button>

      <div className="ms-card p-6 space-y-5">
        <h1 className="text-base font-semibold text-foreground">Bukti Kehadiran</h1>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-muted-foreground">Karyawan</p>
            <p className="font-medium text-foreground">{employee?.name || employeeId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal</p>
            <p className="font-medium text-foreground">{record.date}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Status</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[record.status]}`}>{STATUS_LABEL[record.status]}</span>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Alasan</p>
            <p className="font-medium text-foreground">{record.reason ? REASON_LABEL[record.reason] || record.reason : "-"}</p>
          </div>
          {record.clockIn && (
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Masuk</p>
              <p className="font-medium text-foreground">{record.clockIn}</p>
            </div>
          )}
          {record.clockOut && (
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Keluar</p>
              <p className="font-medium text-foreground">{record.clockOut}</p>
            </div>
          )}
          {record.location && (
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Lokasi</p>
              <p className="font-medium text-foreground">{record.location}</p>
            </div>
          )}
        </div>

        {record.proofImage ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Gambar Bukti</p>
            <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
              <img src={`${apiBase}${record.proofImage}`} alt="Bukti kehadiran" className="w-full max-h-[500px] object-contain" />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
            Belum ada bukti gambar
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AttendanceProof;

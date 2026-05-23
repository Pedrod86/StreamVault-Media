import React, { useState } from 'react';
import { Trash2, X, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function BulkDeleteBar({ selectedIds, onClearSelection, onSelectAll, totalCount }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => base44.entities.Media.delete(id)));
      await queryClient.invalidateQueries({ queryKey: ['media'] });
      await queryClient.invalidateQueries({ queryKey: ['movies'] });
      await queryClient.invalidateQueries({ queryKey: ['shows'] });
      toast.success(`Removed ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''} from library`);
      onClearSelection();
    } catch (e) {
      toast.error('Failed to delete some items');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border shadow-xl rounded-2xl px-4 py-3">
        <button
          onClick={onClearSelection}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {selectedIds.length} selected
        </span>
        <button
          onClick={onSelectAll}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Select all ({totalCount})
        </button>
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5"
          onClick={() => setShowConfirm(true)}
          disabled={deleting}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove {selectedIds.length}
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} from your StreamVault database only — your Emby/Plex server won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
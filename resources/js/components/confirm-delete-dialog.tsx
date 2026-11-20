import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { TrashIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';

type ConfirmDeleteDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description: string;
    url: string;
};

export function ConfirmDeleteDialog({
    open,
    onClose,
    title,
    description,
    url,
}: ConfirmDeleteDialogProps) {
    const [processing, setProcessing] = useState(false);

    function confirm() {
        router.delete(url, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                onClose();
            },
        });
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            icon={
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-low/10 text-low">
                    <TrashIcon />
                </span>
            }
        >
            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>
                    Batal
                </Button>
                <Button
                    onClick={confirm}
                    disabled={processing}
                    className="bg-low shadow-none hover:bg-[#c52c32]"
                >
                    {processing ? 'Menghapus…' : 'Ya, hapus'}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}

type RowActionsProps = {
    onEdit: () => void;
    onDelete: () => void;
    canDelete: boolean;
    deleteHint: string;
    extraAction?: ReactNode;
};

export function RowActions({
    onEdit,
    onDelete,
    canDelete,
    deleteHint,
    extraAction,
}: RowActionsProps) {
    return (
        <div className="flex justify-end gap-1">
            {extraAction}
            <Button variant="ghost" size="sm" onClick={onEdit}>
                Edit
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={!canDelete}
                title={canDelete ? 'Hapus' : deleteHint}
                className="text-[#c52c32] hover:bg-low/10"
            >
                Hapus
            </Button>
        </div>
    );
}

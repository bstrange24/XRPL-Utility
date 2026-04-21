import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { Buffer } from 'buffer';
import { provideHttpClient } from '@angular/common/http';
import process from 'process';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule, Cog, BanknoteArrowUp, BanknoteArrowDown, Trash2, DollarSign, TicketCheck, Check, Hourglass, Wallet, Send, ShieldCheck, Flag, Copy, FileTextIcon, ChevronDown, ChevronRight, BookOpenCheck, ArrowBigRight, RefreshCcw, SplitIcon, Signature, ShieldEllipsis, CopyPlus, Eraser, GripVertical, Eye, EyeOff, CircleCheck, ShieldBan, CornerUpLeft, Sun, Moon, Inbox, Plus, ChevronUp, Edit2, CheckCircle, X, Loader, ShieldOff, ShieldCheckIcon, LockOpen } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';
import {
     heroInformationCircle,
     heroExclamationCircle,
     heroExclamationTriangle,
     heroUsers,
     heroClipboardDocumentList,
     heroArrowDownOnSquareStack,
     heroArrowTopRightOnSquare,
     heroCurrencyDollar,
     heroTrash,
     heroPlusCircle,
     heroPaperAirplane,
     heroTicket,
     heroClock,
     heroQueueList,
     heroArrowUturnLeft,
     heroArrowPath,
     heroUserGroup,
     heroKey,
     heroChartBar,
     heroEye,
     heroEyeSlash,
     heroAdjustmentsVertical,
     heroLockOpen,
     heroLockClosed,
     heroBanknotes,
     heroWallet,
     heroXMark,
     heroXCircle,
     heroCheckCircle,
     heroMoon,
     heroSun,
     heroChevronUp,
     heroChevronDown,
     heroCodeBracket,
} from '@ng-icons/heroicons/outline';
import { NgIconsModule } from '@ng-icons/core';
import { featherCheck, featherX, featherAlertCircle, featherChevronDown, featherCheckCircle } from '@ng-icons/feather-icons';

// Make Buffer and process available globally
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

bootstrapApplication(AppComponent, {
     providers: [
          provideRouter(routes),
          provideHttpClient(),
          provideAnimations(),
          provideAnimationsAsync(),
          importProvidersFrom(BrowserAnimationsModule),
          importProvidersFrom(
               LucideAngularModule.pick({
                    Cog,
                    BanknoteArrowUp,
                    BanknoteArrowDown,
                    Trash2,
                    DollarSign,
                    TicketCheck,
                    Check,
                    Hourglass,
                    Wallet,
                    Send,
                    ShieldCheck,
                    Flag,
                    Copy,
                    FileTextIcon,
                    ChevronDown,
                    ChevronUp,
                    ChevronRight,
                    BookOpenCheck,
                    ArrowBigRight,
                    RefreshCcw,
                    SplitIcon,
                    Signature,
                    ShieldEllipsis,
                    CopyPlus,
                    Plus,
                    Eraser,
                    GripVertical,
                    Eye,
                    EyeOff,
                    CircleCheck,
                    ShieldBan,
                    CornerUpLeft,
                    Sun,
                    Moon,
                    Inbox,
                    Loader,
                    Edit2,
                    CheckCircle,
                    X,
                    ShieldOff,
                    ShieldCheckIcon,
                    LockOpen,
               })
          ),
          importProvidersFrom(
               NgIconsModule.withIcons({
                    featherCheck: featherCheck,
                    featherX: featherX,
                    featherAlertCircle: featherAlertCircle,
                    featherChevronDown: featherChevronDown,
                    featherCheckCircle: featherCheckCircle,
               })
          ),
          provideIcons({
               heroChevronUp,
               heroChevronDown,
               heroInformationCircle,
               heroExclamationCircle,
               heroExclamationTriangle,
               heroUsers,
               heroClipboardDocumentList,
               heroArrowDownOnSquareStack,
               heroArrowTopRightOnSquare,
               heroCurrencyDollar,
               heroTrash,
               heroPlusCircle,
               heroPaperAirplane,
               heroTicket,
               heroClock,
               heroQueueList,
               heroArrowUturnLeft,
               heroArrowPath,
               heroUserGroup,
               heroKey,
               heroChartBar,
               heroEye,
               heroEyeSlash,
               heroAdjustmentsVertical,
               heroLockOpen,
               heroLockClosed,
               heroBanknotes,
               heroWallet,
               heroXMark,
               heroXCircle,
               heroCheckCircle,
               heroMoon,
               heroSun,
               heroCodeBracket,
          }),
     ],
}).catch(err => console.error(err));

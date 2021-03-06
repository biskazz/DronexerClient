import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, OnDestroy } from '@angular/core';

import { AuthHelperService } from '../../utilities/auth-helper.service';
import { MaterializeAction } from 'angular2-materialize';
import { MetadataService } from '../../services/metadata.service';
import { PicturesService } from '../../services/pictures.service';
import { PostsService } from '../../services/posts.service';
import { StaticDataService } from '../../services/static-data.service';
import { Subscription } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ValidateService } from '../../services/validate.service';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.css']
})
export class PostComponent implements OnInit, OnDestroy {

  @Input() post;
  @Input() isSingle = false;
  @ViewChild('postElement') postElement: ElementRef;
  deleteModal = new EventEmitter<string | MaterializeAction>();
  editModal = new EventEmitter<string | MaterializeAction>();
  newComment: string;
  subscriptions: Subscription[] = [];
  shareUrl = ``;
  shareDescription = ``;
  shareImgUrl = ``;

  constructor(private toastService: ToastService,
              private picturesService: PicturesService,
              private authHelperService: AuthHelperService,
              private postsService: PostsService,
              private staticDataService: StaticDataService,
              private validateService: ValidateService,
              private metadataService: MetadataService) {
  }

  ngOnInit() {
    this.post.pictureUrl = this.postsService.getPictureUrlForPost(this.post);
    this.post.profilePicUrl = this.picturesService.getProfilePicUrl(this.post.user._id);
    this.post.canEdit = (this.post.user._id === this.authHelperService.getUserIdFromToken());
    this.post.hasMetadata = this.metadataService.hasMetadata(this.post.metadata);
    this.newComment = '';
    this.shareUrl = `https://dronexer.com/post/${this.post._id}`;
    this.shareImgUrl = `https://dronexer.com${this.post.pictureUrl}`;
    this.shareDescription = `Drone shot by ${this.post.username}. Join dronexer.com for more!`;
    if (this.isSingle) {
      if (this.post.commentsCount) {
        this.loadComments();
      }
      this.post.showShareButtons = true;
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
  }

  openDeleteModal() {
    this.post.showDeleteModal = true;
    setTimeout(() => {
      this.deleteModal.emit({ action: 'modal', params: ['open'] });
    }, 200);
  }

  closeDeleteModal() {
    this.deleteModal.emit({ action: 'modal', params: ['close'] });
  }

  openEditModal() {
    this.post.showEditModal = true;
    setTimeout(() => {
      this.editModal.emit({ action: 'modal', params: ['open'] });
    }, 200);
  }

  closeEditModal() {
    this.editModal.emit({ action: 'modal', params: ['close'] });
  }

  commentPost() {
    if (!this.post.comments && this.post.commentsCount > 0) {
      this.loadComments();
    }
    const comment = this.newComment;
    const postId = this.post._id;
    if (comment.length) {
      this.subscriptions.push(this.postsService.commentPost(postId, { comment }).subscribe((data) => {
        if (!this.post.comments) {
          this.post.comments = [];
        }
        const commentToAdd = {
          user: this.authHelperService.getDecodedAuthToken(),
          username: this.authHelperService.getUsernameFromToken(),
          comment: comment
        };
        this.post.comments.push(commentToAdd);
        this.post.commentsCount += 1;
        this.post.showComments = true;
      }, (error) => {
        if (error.status === 401) {
          this.toastService.toast('Log in to comment.');
        }
      }));
      this.newComment = '';
    }
  }

  likePost() {
    const postId = this.post._id;
    this.subscriptions.push(this.postsService.likePost(postId).subscribe((data) => {
      this.post.isLikedByCurrentUser = true;
      this.post.likesCount += 1;
    }, (error) => {
      if (error.status === 401) {
        this.toastService.toast('Log in to like posts.');
      }
      console.log(error);
    }));
  }

  unLikePost() {
    const postId = this.post._id;
    this.subscriptions.push(this.postsService.unLikePost(postId).subscribe((data) => {
      this.post.isLikedByCurrentUser = false;
      this.post.likesCount -= 1;
    }, (error) => {
      console.log(error);
    }));
  }

  deletePost() {
    const postId = this.post._id;
    this.subscriptions.push(this.postsService.deletePost(postId).subscribe((data) => {
      this.postElement.nativeElement.remove();
      this.closeDeleteModal();
    }, (error) => {
      console.log(error);
    }));
  }

  editPost(eventPayload) {
    const postId = this.post._id;
    const dataToSend = { ...eventPayload };
    dataToSend.newTags = this.validateService.getTagsArray(dataToSend.newTags);
    this.subscriptions.push(this.postsService.editPost(postId, dataToSend).subscribe((response) => {
      if (response.success) {
        let editedPostData = response.data;
        this.post.caption = editedPostData.caption;
        this.post.tags = editedPostData.tags;
        this.post.droneTaken = editedPostData.droneTaken;
        this.closeEditModal();
      }
    }, (error) => {
      if (error.status === 401) {
        this.toastService.toast('Log in to edit posts.');
      }
      console.log(error);
    }));
  }

  loadComments() {
    const postId = this.post._id;
    this.subscriptions.push(this.postsService.getComments(postId).subscribe((comments) => {
      if (comments.success) {
        this.post.comments = comments.data;
        this.post.showComments = true;
      }
    }, (error) => {
      console.log(error);
      this.toastService.toast('Couldn\'t load comments.');
    }));
  }
}

